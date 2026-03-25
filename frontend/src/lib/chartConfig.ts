import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  BarElement,
  ArcElement,
  Filler,
} from 'chart.js';

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  CategoryScale,
  BarElement,
  ArcElement,
  Filler
);

// Global defaults for the neon theme
ChartJS.defaults.color = '#9ca3af';
ChartJS.defaults.font.family = 'Inter, sans-serif';
ChartJS.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
