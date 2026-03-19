'use client';

import { useState, useEffect } from 'react';
import styles from './CurrencySelector.module.css';

interface Rates {
    [key: string]: number;
}

const SUPPORTED_CURRENCIES = [
    { code: 'KRW', symbol: '₩' },
    { code: 'USD', symbol: '$' },
    { code: 'JPY', symbol: '¥' },
    { code: 'CNY', symbol: '¥' },
    { code: 'EUR', symbol: '€' },
    { code: 'GBP', symbol: '£' },
    { code: 'THB', symbol: '฿' },
    { code: 'VND', symbol: '₫' },
    { code: 'PHP', symbol: '₱' },
    { code: 'SGD', symbol: '$' },
];

export default function CurrencySelector() {
    const [selected, setSelected] = useState('KRW');
    const [rates, setRates] = useState<Rates>({});
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const res = await fetch('https://open.er-api.com/v6/latest/KRW');
                const data = await res.json();
                if (data && data.rates) {
                    setRates(data.rates);
                }
            } catch (error) {
                console.error('Failed to fetch rates:', error);
            }
        };
        fetchRates();
    }, []);

    // Load from local storage
    useEffect(() => {
        const saved = localStorage.getItem('ktrip_currency');
        if (saved) setSelected(saved);
    }, []);

    const handleSelect = (code: string) => {
        setSelected(code);
        localStorage.setItem('ktrip_currency', code);
        setIsOpen(false);
        // Dispatch an event to notify other components if needed
        window.dispatchEvent(new CustomEvent('ktrip_currency_change', { detail: code }));
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
                <span>{selected}</span>
                <span className={styles.arrow}>▼</span>
            </div>

            {isOpen && (
                <>
                    <div className={styles.backdrop} onClick={() => setIsOpen(false)} />
                    <div className={styles.dropdown}>
                        {SUPPORTED_CURRENCIES.map(curr => (
                            <button
                                key={curr.code}
                                className={`${styles.item} ${selected === curr.code ? styles.active : ''}`}
                                onClick={() => handleSelect(curr.code)}
                            >
                                <span className={styles.code}>{curr.code}</span>
                                <span className={styles.symbol}>{curr.symbol}</span>
                                {curr.code !== 'KRW' && rates[curr.code] && (
                                    <span className={styles.rate}>
                                        1k ₩ ≈ {(rates[curr.code] * 1000).toFixed(2)} {curr.code}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
