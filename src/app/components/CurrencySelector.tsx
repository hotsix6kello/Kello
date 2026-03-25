'use client';

import { useState, useEffect } from 'react';
import styles from './CurrencySelector.module.css';

interface Rates {
    [key: string]: number;
}

const SUPPORTED_CURRENCIES = [
    { code: 'KRW', symbol: '₩', flag: 'https://flagcdn.com/w40/kr.png' },
    { code: 'USD', symbol: '$', flag: 'https://flagcdn.com/w40/us.png' },
    { code: 'JPY', symbol: '¥', flag: 'https://flagcdn.com/w40/jp.png' },
    { code: 'CNY', symbol: '¥', flag: 'https://flagcdn.com/w40/cn.png' },
    { code: 'HKD', symbol: '$', flag: 'https://flagcdn.com/w40/hk.png' },
    { code: 'EUR', symbol: '€', flag: 'https://flagcdn.com/w40/eu.png' },
    { code: 'GBP', symbol: '£', flag: 'https://flagcdn.com/w40/gb.png' },
    { code: 'THB', symbol: '฿', flag: 'https://flagcdn.com/w40/th.png' },
    { code: 'VND', symbol: '₫', flag: 'https://flagcdn.com/w40/vn.png' },
    { code: 'PHP', symbol: '₱', flag: 'https://flagcdn.com/w40/ph.png' },
    { code: 'SGD', symbol: '$', flag: 'https://flagcdn.com/w40/sg.png' },
    { code: 'IDR', symbol: 'Rp', flag: 'https://flagcdn.com/w40/id.png' },
    { code: 'MYR', symbol: 'RM', flag: 'https://flagcdn.com/w40/my.png' },
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
        const saved = localStorage.getItem('kello_currency');
        if (saved) setSelected(saved);
    }, []);

    const handleSelect = (code: string) => {
        setSelected(code);
        localStorage.setItem('kello_currency', code);
        setIsOpen(false);
        // Dispatch an event to notify other components if needed
        window.dispatchEvent(new CustomEvent('kello_currency_change', { detail: code }));
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
                <img 
                    src={SUPPORTED_CURRENCIES.find(c => c.code === selected)?.flag} 
                    alt="" 
                    className="w-5 h-3.5 object-cover rounded-[2px] mr-2" 
                />
                <span className="font-bold">{selected}</span>
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
                                <img src={curr.flag} alt="" className="w-5 h-3.5 object-cover rounded-[2px] mr-3 shrink-0" />
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
