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

export interface SharedLocation {
    name: string;
    lat: number;
    lng: number;
}

export interface SharedBusinessPhoto {
    name?: string;
}

export interface SharedBusinessDisplayName {
    text?: string;
}

export interface SharedBusinessLocation {
    latitude?: number | string;
    longitude?: number | string;
}

export interface SharedBusinessGeometryLocation {
    lat?: number | string;
    lng?: number | string;
}

export interface SharedBusiness {
    id?: string;
    place_id?: string;
    name?: string;
    title?: string;
    displayName?: SharedBusinessDisplayName;
    lat?: number | string;
    lng?: number | string;
    x?: number | string;
    y?: number | string;
    location?: SharedBusinessLocation;
    geometry?: {
        location?: SharedBusinessGeometryLocation;
    };
    category?: string;
    types?: string[];
    rating?: number;
    user_ratings_total?: number;
    vicinity?: string;
    formatted_address?: string;
    formattedAddress?: string;
    address?: string;
    imageUrl?: string;
    image_url?: string;
    photos?: SharedBusinessPhoto[];
}

interface TripContextType {
    tripStatus: TripMode;
    tripDays: number;
    itinerary: ItineraryItem[];
    selectedCategory: string | null;
    searchQuery: string;
    destinationInfo: SharedLocation | null;
    sharedBusinesses: SharedBusiness[];
    lastSelectedStoreId: string | null;
    setTripStatus: (status: TripMode) => void;
    setTripDays: (days: number) => void;
    addItineraryItem: (item: ItineraryItem) => void;
    removeItineraryItem: (id: string) => void;
    setItinerary: (items: ItineraryItem[]) => void;
    setSelectedCategory: (category: string | null) => void;
    setSearchQuery: (query: string) => void;
    setDestinationInfo: (info: SharedLocation | null) => void;
    setSharedBusinesses: (businesses: SharedBusiness[]) => void;
    setLastSelectedStoreId: (id: string | null) => void;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function TripProvider({ children }: { children: React.ReactNode }) {
    const [tripStatus, setTripStatus] = useState<TripMode>('idle');
    const [tripDays, setTripDays] = useState<number>(3);
    const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [destinationInfo, setDestinationInfo] = useState<SharedLocation | null>(null);
    const [sharedBusinesses, setSharedBusinesses] = useState<SharedBusiness[]>([]);
    const [lastSelectedStoreId, setLastSelectedStoreId] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedItinerary = localStorage.getItem('trip_itinerary');
            if (savedItinerary) {
                const parsed = JSON.parse(savedItinerary);
                if (Array.isArray(parsed)) {
                    setItinerary(parsed);
                }
            }
        } catch (e) {
            console.error('Failed to parse saved itinerary', e);
        }

        try {
            const savedDays = localStorage.getItem('trip_days');
            if (savedDays) {
                const parsedDays = parseInt(savedDays);
                if (!isNaN(parsedDays)) {
                    setTripDays(parsedDays);
                }
            }
        } catch (e) {
            console.error('Failed to parse saved trip days', e);
        }

        const savedCategory = localStorage.getItem('trip_category');
        if (savedCategory) {
            setSelectedCategory(savedCategory);
        }

        const savedSearch = localStorage.getItem('trip_search_query');
        if (savedSearch) {
            setSearchQuery(savedSearch);
        }

        try {
            const savedDest = localStorage.getItem('trip_destination_info');
            if (savedDest) {
                const parsedDest = JSON.parse(savedDest);
                if (parsedDest && typeof parsedDest.lat === 'number') {
                    setDestinationInfo(parsedDest);
                }
            }
        } catch (e) {
            console.error('Failed to parse saved destination info', e);
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

    useEffect(() => {
        if (selectedCategory) {
            localStorage.setItem('trip_category', selectedCategory);
        } else {
            localStorage.removeItem('trip_category');
        }
    }, [selectedCategory]);

    useEffect(() => {
        localStorage.setItem('trip_search_query', searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        if (destinationInfo) {
            localStorage.setItem('trip_destination_info', JSON.stringify(destinationInfo));
        } else {
            localStorage.removeItem('trip_destination_info');
        }
    }, [destinationInfo]);

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
            selectedCategory,
            searchQuery,
            destinationInfo,
            setTripStatus,
            setTripDays,
            addItineraryItem,
            removeItineraryItem,
            setItinerary,
            setSelectedCategory,
            setSearchQuery,
            setDestinationInfo,
            sharedBusinesses,
            setSharedBusinesses,
            lastSelectedStoreId,
            setLastSelectedStoreId
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
