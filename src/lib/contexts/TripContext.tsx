'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type BookingStatus = 'draft' | 'submitted' | 'in_progress' | 'confirmed' | 'unavailable' | 'canceled' | 'completed';
export type TripMode = 'idle' | 'pre-trip' | 'on-trip' | 'near-deadline';

export interface ItineraryItem {
    id: string;
    // Stable source/service id when this item originated from an existing place or plan item.
    sourceItemId?: string;
    name: string;
    time: string;
    status: BookingStatus;
    lat: number;
    lng: number;
    day?: number;
    slot?: 'am' | 'pm' | 'night';
    type?: string;
    image_color?: string;
    badges?: string[];
}

interface TripContextType {
    tripStatus: TripMode;
    tripDays: number;
    itinerary: ItineraryItem[];
    setTripStatus: (status: TripMode) => void;
    setTripDays: (days: number) => void;
    addItineraryItem: (item: ItineraryItem) => void;
    removeItineraryItem: (id: string) => void;
    setItinerary: (items: ItineraryItem[]) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: React.ReactNode }) {
    const [tripStatus, setTripStatus] = useState<TripMode>('idle');
    const [tripDays, setTripDays] = useState<number>(3);
    const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);

    useEffect(() => {
        const savedItinerary = localStorage.getItem('trip_itinerary');
        if (savedItinerary) {
            setItinerary(JSON.parse(savedItinerary));
        }

        const savedDays = localStorage.getItem('trip_days');
        if (savedDays) {
            setTripDays(parseInt(savedDays));
        }
    }, []);

    useEffect(() => {
        if (itinerary.length > 0) {
            localStorage.setItem('trip_itinerary', JSON.stringify(itinerary));
            if (tripStatus === 'idle') setTripStatus('pre-trip');
        }
    }, [itinerary, tripStatus]);

    useEffect(() => {
        localStorage.setItem('trip_days', tripDays.toString());
    }, [tripDays]);

    const addItineraryItem = (item: ItineraryItem) => {
        setItinerary(prev => [...prev, item]);
    };

    const removeItineraryItem = (id: string) => {
        setItinerary(prev => prev.filter(i => i.id !== id));
    };

    return (
        <TripContext.Provider value={{
            tripStatus,
            tripDays,
            itinerary,
            setTripStatus,
            setTripDays,
            addItineraryItem,
            removeItineraryItem,
            setItinerary
        }}>
            {children}
        </TripContext.Provider>
    );
}

export function useTrip() {
    const context = useContext(TripContext);
    if (context === undefined) {
        throw new Error('useTrip must be used within a TripProvider');
    }
    return context;
}
