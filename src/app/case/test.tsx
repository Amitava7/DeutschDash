import { useState, useEffect, useCallback } from "react";

const API_URL = "https://api.example.com/data";

export default function DataFetcher() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            setData(json);
        } catch {
            setError("error");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div>
            {loading && <p>Loading...</p>}
            {error && <p>Error: {error}</p>}
            {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
            <button onClick={fetchData} disabled={loading}>
                Refresh
            </button>
        </div>
    );
}
