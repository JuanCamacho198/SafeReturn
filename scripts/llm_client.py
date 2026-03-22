"""Groq LLM Client Wrapper

Provides rate limiting, prompt caching, and error retry logic
for interacting with the Groq API.
"""

import logging
import time
from functools import lru_cache
from typing import Any

from groq import Groq

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "llama-3.3-70b-versatile"
MAX_RETRIES = 3
RETRY_DELAY_BASE = 2.0
RATE_LIMIT_DELAY = 1.0
CACHE_MAX_SIZE = 100


class GroqClientWrapper:
    """Thread-safe Groq API client with rate limiting and retry logic."""

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        max_retries: int = MAX_RETRIES,
        rate_limit_delay: float = RATE_LIMIT_DELAY,
    ):
        self.client = Groq(api_key=api_key)
        self.model = model
        self.max_retries = max_retries
        self.rate_limit_delay = rate_limit_delay
        self._request_count = 0
        self._last_request_time = 0.0

    def _throttle(self) -> None:
        """Apply rate limiting between requests."""
        current_time = time.time()
        elapsed = current_time - self._last_request_time
        if elapsed < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - elapsed
            logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)
        self._last_request_time = time.time()

    def _retry_with_backoff(self, func: callable, *args: Any, **kwargs: Any) -> Any:
        """Execute function with exponential backoff retry on failure."""
        last_exception = None

        for attempt in range(self.max_retries):
            try:
                self._throttle()
                result = func(*args, **kwargs)
                self._request_count += 1
                return result
            except Exception as e:
                last_exception = e
                if "rate_limit" in str(e).lower() or "429" in str(e):
                    wait_time = RETRY_DELAY_BASE * (2**attempt)
                    logger.warning(
                        f"Rate limit hit (attempt {attempt + 1}/{self.max_retries}), "
                        f"waiting {wait_time:.1f}s"
                    )
                    time.sleep(wait_time)
                elif "500" in str(e) or "502" in str(e) or "503" in str(e):
                    wait_time = RETRY_DELAY_BASE * (2**attempt)
                    logger.warning(
                        f"Server error {e} (attempt {attempt + 1}/{self.max_retries}), "
                        f"waiting {wait_time:.1f}s"
                    )
                    time.sleep(wait_time)
                else:
                    if attempt < self.max_retries - 1:
                        wait_time = RETRY_DELAY_BASE * (2**attempt)
                        logger.warning(
                            f"Error: {e} (attempt {attempt + 1}/{self.max_retries}), "
                            f"retrying in {wait_time:.1f}s"
                        )
                        time.sleep(wait_time)
                    else:
                        logger.error(f"Max retries reached for error: {e}")

        raise last_exception

    def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
    ) -> str:
        """Generate text completion with retry logic.

        Args:
            prompt: User prompt for the LLM
            system_prompt: Optional system prompt for context
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate

        Returns:
            Generated text string
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        def _call_api() -> Any:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content

        result = self._retry_with_backoff(_call_api)
        return result if result else ""

    @property
    def request_count(self) -> int:
        """Return total number of API requests made."""
        return self._request_count


@lru_cache(maxsize=CACHE_MAX_SIZE)
def _cached_generate(
    api_key: str,
    model: str,
    prompt_hash: int,
    prompt: str,
    temperature: float,
) -> str:
    """Cached wrapper for prompt generation (based on prompt content hash)."""
    client = GroqClientWrapper(api_key=api_key, model=model)
    return client.generate(prompt=prompt, temperature=temperature)


def generate_with_cache(
    api_key: str,
    prompt: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,
) -> str:
    """Generate text with basic caching based on prompt content.

    Args:
        api_key: Groq API key
        prompt: User prompt
        model: Model to use
        temperature: Sampling temperature

    Returns:
        Generated text
    """
    prompt_hash = hash(prompt)
    return _cached_generate(
        api_key=api_key,
        model=model,
        prompt_hash=prompt_hash,
        prompt=prompt,
        temperature=temperature,
    )


def create_client(api_key: str, model: str | None = None) -> GroqClientWrapper:
    """Factory function to create a configured Groq client.

    Args:
        api_key: Groq API key
        model: Optional model override

    Returns:
        Configured GroqClientWrapper instance
    """
    return GroqClientWrapper(api_key=api_key, model=model or DEFAULT_MODEL)
