"""Synthetic Clinical Data Generation Script

Generates 100 synthetic patient records with demographics, diagnoses,
clinical notes (via Groq LLM), lab results, medications, and readmission outcomes.
"""

import argparse
import logging
import random
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from faker import Faker

from icd10_prevalence import (
    COMORBIDITY_WEIGHTS,
    DIAGNOSIS_LAB_CORRELATIONS,
    ICD10_MEDICATION_MAP,
    ICD10_PREVALENCE,
)
from schemas import (
    AGE_DISTRIBUTION,
    ETHNICITY_WEIGHTS,
    GENDER_WEIGHTS,
    INSURANCE_WEIGHTS,
)
    "N_PATIENTS": 100,
    "MIN_DIAGNOSES": 2,
    "MAX_DIAGNOSES": 6,
    "READMISSION_BASE_RATE": 0.16,
    "OUTPUT_FILE": "data/synthetic_patients.json",
    "CHECKPOINT_INTERVAL": 10,
}

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "standard",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.FileHandler",
            "level": "DEBUG",
            "formatter": "standard",
            "filename": "logs/generate_clinical_data.log",
            "mode": "a",
        },
    },
    "root": {
        "level": "DEBUG",
        "handlers": ["console", "file"],
    },
}


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure logging for the script."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    return logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate synthetic clinical data for research purposes."
    )
    parser.add_argument(
        "-n",
        "--num-patients",
        type=int,
        default=CONFIG["N_PATIENTS"],
        help=f"Number of patients to generate (default: {CONFIG['N_PATIENTS']})",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=CONFIG["OUTPUT_FILE"],
        help="Output JSON file path",
    )
    parser.add_argument(
        "-s",
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--no-notes",
        action="store_true",
        help="Skip clinical note generation (faster generation)",
    )
    parser.add_argument(
        "--checkpoint",
        type=int,
        default=CONFIG["CHECKPOINT_INTERVAL"],
        help="Save checkpoint every N patients",
    )
    return parser.parse_args()


def main():
    """Main entry point for clinical data generation."""
    args = parse_args()
    logger = setup_logging(args.verbose)

    logger.info(f"Starting clinical data generation for {args.num_patients} patients")
    logger.info(f"Random seed: {args.seed}")
    logger.info(f"Output file: {args.output}")

    logger.info("Phase 1: Foundation tasks completed")
    logger.info("To continue: implement Phase 2 core generation functions")

    return 0


if __name__ == "__main__":
    sys.exit(main())
