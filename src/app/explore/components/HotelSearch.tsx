'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../explore.module.css';
import { useTranslation } from 'react-i18next';

interface HotelSearchProps {
    onSelect: (location: { lat: number, lng: number, name: string, placeId: string }) => void;
}

export default function HotelSearch({ onSelect }: HotelSearchProps) {
    const { t } = useTranslation('common');
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInput = async (val: string) => {
        setInput(val);
        if (val.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            const res = await fetch('/api/places/autocomplete', {
                method: 'POST',
                body: JSON.stringify({ input: val }),
            });
            const data = await res.json();
            setSuggestions(data.suggestions || []);
            setIsOpen(true);
        } catch (error) {
            console.error('Autocomplete error:', error);
        }
    };

    const handleSelect = async (suggestion: any) => {
        const id = suggestion.placePrediction.placeId;
        const name = suggestion.placePrediction.text.text;
        setInput(name);
        setIsOpen(false);

        try {
            const res = await fetch(`/api/places/details?placeId=${id}`);
            const data = await res.json();
            if (data.location) {
                onSelect({
                    lat: data.location.latitude,
                    lng: data.location.longitude,
                    name: name,
                    placeId: id
                });
            }
        } catch (error) {
            console.error('Details error:', error);
        }
    };

    return (
        <div className={styles.hotelSearchWrapper} ref={wrapperRef}>
            <div className={styles.hotelSearchInputBox}>
                <input
                    type="text"
                    placeholder="Hotel / Address in Korea"
                    value={input}
                    onChange={(e) => handleInput(e.target.value)}
                    onFocus={() => input.length >= 2 && setIsOpen(true)}
                />
            </div>

            {isOpen && suggestions.length > 0 && (
                <ul className={styles.suggestionsList}>
                    {suggestions.map((s, i) => (
                        <li key={i} onClick={() => handleSelect(s)}>
                            <span className={styles.suggestionIcon}>📍</span>
                            <span className={styles.suggestionText}>{s.placePrediction.text.text}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
