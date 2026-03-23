"use client";

import { useState, useEffect } from 'react';

const CACHE_KEY = 'kello_weather_cache';

export default function WeatherWidget() {
    const [weatherData, setWeatherData] = useState<{ temp: number; icon: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 1. Load from cache first for instant display
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                setWeatherData(JSON.parse(cached));
                setIsLoading(false);
            } catch { /* ignore */ }
        }

        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                if (!res.ok) return;

                const data = await res.json();
                if (data.current_weather) {
                    const code = data.current_weather.weathercode;
                    let icon = '🌤️';

                    if (code === 0) icon = '☀️';
                    else if (code >= 1 && code <= 3) icon = '⛅';
                    else if (code >= 45 && code <= 48) icon = '🌫️';
                    else if (code >= 51 && code <= 67) icon = '🌧️';
                    else if (code >= 71 && code <= 77) icon = '❄️';
                    else if (code >= 80 && code <= 82) icon = '🌦️';
                    else if (code >= 95) icon = '⛈️';

                    const newWeather = {
                        temp: Math.round(data.current_weather.temperature),
                        icon: icon
                    };
                    
                    setWeatherData(newWeather);
                    localStorage.setItem(CACHE_KEY, JSON.stringify(newWeather));
                }
            } catch (err) {
                console.warn("Weather fetch failed", err);
            } finally {
                setIsLoading(false);
            }
        };

        // 2. Try geolocation, fallback to Seoul if slow/blocked
        const timeoutId = setTimeout(() => {
            if (isLoading) fetchWeather(37.5665, 126.9780); // Default: Seoul
        }, 3000);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    clearTimeout(timeoutId);
                    fetchWeather(pos.coords.latitude, pos.coords.longitude);
                },
                () => {
                    clearTimeout(timeoutId);
                    fetchWeather(37.5665, 126.9780);
                },
                { timeout: 5000 }
            );
        } else {
            clearTimeout(timeoutId);
            fetchWeather(37.5665, 126.9780);
        }

        return () => clearTimeout(timeoutId);
    }, []);

    const widgetStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        backgroundColor: 'var(--gray-100)',
        padding: '4px 10px',
        borderRadius: '20px',
        color: 'var(--foreground)',
        border: '1px solid var(--gray-200)',
        fontWeight: 600,
        minWidth: '54px',
        justifyContent: 'center',
        opacity: isLoading && !weatherData ? 0.5 : 1,
        transition: 'opacity 0.3s ease'
    };

    if (isLoading && !weatherData) {
        return (
            <div style={widgetStyle}>
                 <span className="animate-pulse">◌</span>
                 <span className="animate-pulse">--°C</span>
            </div>
        );
    }

    if (!weatherData) return null;

    return (
        <div style={widgetStyle}>
            <span>{weatherData.icon}</span>
            <span>{weatherData.temp}°C</span>
        </div>
    );
}
