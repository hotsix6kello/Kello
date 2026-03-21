import { ItineraryItem } from '@/lib/contexts/TripContext';

export interface RecommendedPlan {
  id: string;
  duration: number;
  title: string;
  label: string;
  icon: string;
  items: Array<Omit<ItineraryItem, 'id'> & { id: string; [key: string]: unknown }>;
}
