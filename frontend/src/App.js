import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { BrowserRouter as Router, Route, Routes, NavLink, useNavigate, Navigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Skeleton } from "./components/ui/skeleton";
import { Label } from "./components/ui/label";
import { apiCall } from "./lib/utils";
import PropTypes from 'prop-types';
import { createChart } from 'lightweight-charts';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, ComposedChart } from "recharts";
import { Bot, Search, TrendingUp, Download, Moon, Sun, Brain, Newspaper, Loader2, Link as LinkIcon, CheckCircle, XCircle, MinusCircle, DollarSign, Target, Heart, Calculator, Home, Briefcase, ShoppingCart, ArrowRight, LogIn, LogOut, UserPlus, Menu, Wallet, History, ChevronsRight, LineChart as LineChartIcon, CandlestickChart, Send, Link2, Pencil, Check, X, Bell, PlusCircle, Trash2 } from "lucide-react";

import AnimatedCard from "./components/AnimatedCard";
import AnimatedInput from "./components/AnimatedInput";
import GlowButton from "./components/GlowButton";
import MetricCard from "./components/MetricCard";

import "./App.css";

// --- CONTEXT & UTILITY ---
const AppContext = createContext(null);
const useAppContext = () => useContext(AppContext);
const getCurrency = (ticker = "") => ticker.toUpperCase().endsWith('.NS') ? '₹' : '$';

// --- HELPER COMPONENTS ---

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        const ticker = payload[0].payload.Ticker || "";
        const currency = getCurrency(ticker);
        const formatValue = (pld) => {
            const key = pld.dataKey || pld.name;
            if (key.toLowerCase().includes('volume') || key.toLowerCase().includes('obv')) return pld.value.toLocaleString();
            if (key.toLowerCase().includes('rsi') || key.toLowerCase().includes('score')) return pld.value.toFixed(1);
            if (key.toLowerCase().includes('atr')) return pld.value.toFixed(3);
            return currency + pld.value.toFixed(2);
        };
        return (
            <div className="bg-white/80 dark:bg-gray-900/80 p-3 border rounded-lg shadow-xl text-sm backdrop-blur-sm">
                <p className="font-bold text-gray-800 dark:text-gray-200">{new Date(label).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                {payload.map((pld, i) => (
                    <p key={i} style={{ color: pld.stroke || pld.fill }}>{`${pld.name}: ${formatValue(pld)}`}</p>
                ))}
            </div>
        );
    }
    return null;
};
CustomTooltip.propTypes = { active: PropTypes.bool, payload: PropTypes.array, label: PropTypes.number };


const StockSearchInput = ({ value, onChange, onSelect, allTickers }) => {
    const [isFocused, setIsFocused] = useState(false);
    const suggestions = value ? allTickers.filter(t => t.toLowerCase().startsWith(value.toLowerCase())).slice(0, 10) : [];
    const wrapperRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsFocused(false); }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);
    return (
        <div className="relative flex-grow" ref={wrapperRef}>
            <AnimatedInput value={value} onChange={e => onChange(e.target.value)} onFocus={() => setIsFocused(true)} placeholder="Search NIFTY & US Stocks (e.g., RELIANCE.NS, AAPL)" />
            {isFocused && value && (
                <Card className="absolute z-20 w-full mt-1 animate-fade-in-fast shadow-2xl">
                    <CardContent className="p-2 max-h-60 overflow-y-auto">
                        {suggestions.length > 0 ? (
                            suggestions.map(s => <div key={s} onMouseDown={() => { onSelect(s); setIsFocused(false); }} className="p-2 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/50 cursor-pointer text-base">{s}</div>)
                        ) : (
                            <div className="p-2 text-gray-500">No stocks found.</div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
StockSearchInput.propTypes = { value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired, onSelect: PropTypes.func.isRequired, allTickers: PropTypes.array.isRequired };


const Toast = ({ message, type, onHide }) => {
    useEffect(() => {
        const timer = setTimeout(onHide, 3000);
        return () => clearTimeout(timer);
    }, [onHide]);
    return (
        <div className={`toast-notification ${type === 'success' ? 'success' : 'error'}`}>
            {type === 'success' ? <CheckCircle /> : <XCircle />}
            <span>{message}</span>
        </div>
    );
};
Toast.propTypes = { message: PropTypes.string.isRequired, type: PropTypes.string.isRequired, onHide: PropTypes.func.isRequired };


const TickerTape = () => {
    const [indices, setIndices] = useState(null);
    useEffect(() => {
        const fetchIndices = async () => {
            try { setIndices(await apiCall('/market-indices')); } catch (error) { console.error("Could not fetch market indices:", error); }
        };
        fetchIndices();
        const interval = setInterval(fetchIndices, 60000);
        return () => clearInterval(interval);
    }, []);

    const renderIndex = (name, data) => {
        if (!data || !data.currentPrice) return <span className="mx-4 text-gray-400">{name}: Loading...</span>;
        const isPositive = data.change >= 0;
        return (
            <span className="mx-4 inline-flex items-center text-sm">
                <span className="font-bold text-white">{name}:</span>
                <span className="ml-2 text-white">{data.currentPrice.toFixed(2)}</span>
                <span className={`ml-2 font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? '▲' : '▼'} {data.change.toFixed(2)} ({data.percentChange.toFixed(2)}%)
                </span>
            </span>
        );
    };

    return (
        <div className="ticker-tape">
            <div className="ticker-content">
                {renderIndex("NIFTY 50", indices?.["NIFTY 50"])}{renderIndex("SENSEX", indices?.["SENSEX"])}{renderIndex("NIFTY 50", indices?.["NIFTY 50"])}{renderIndex("SENSEX", indices?.["SENSEX"])}
            </div>
        </div>
    );
};

const SellModal = ({ stockToSell, setStockToSell }) => {
    const { portfolio, setPortfolio, setFunds, showToast, logTransaction, stockData, exchangeRate } = useAppContext();
    const stock = portfolio.find(s => s.ticker === stockToSell);
    const [quantity, setQuantity] = useState(1);
    if (!stock || !stockData || stockData.ticker !== stockToSell) return null;
    const isForeign = !stock.ticker.toUpperCase().endsWith('.NS');
    const saleValue = stockData.currentPrice * quantity * (isForeign ? exchangeRate : 1);
    const profit = saleValue - (stock.purchasePrice * quantity * (isForeign ? exchangeRate : 1));

    const handleSell = () => {
        if (quantity <= 0 || quantity > stock.quantity) { showToast("Invalid quantity.", "error"); return; }
        setFunds(prev => prev + saleValue);
        setPortfolio(prev => {
            if (stock.quantity === quantity) return prev.filter(s => s.ticker !== stockToSell);
            return prev.map(s => s.ticker === stockToSell ? { ...s, quantity: s.quantity - quantity } : s);
        });
        logTransaction('SELL', stockToSell, quantity, stockData.currentPrice);
        showToast(`Sold ${quantity} share(s) of ${stockToSell} for ₹${saleValue.toFixed(2)}`, "success");
        setStockToSell(null);
    };
    return (
        <div className="modal-overlay" onClick={() => setStockToSell(null)}>
            <AnimatedCard className="modal-content card-style" onClick={e => e.stopPropagation()}>
                <CardHeader><CardTitle>Sell {stock.ticker}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm"><span>You own:</span><span className="font-medium">{stock.quantity} shares</span></div>
                    <div className="flex justify-between text-sm"><span>Avg. Buy Price:</span><span className="font-medium">{getCurrency(stock.ticker)}{stock.purchasePrice.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm"><span>Current Price:</span><span className="font-medium">{getCurrency(stock.ticker)}{stockData.currentPrice.toFixed(2)}</span></div>
                    <hr className="dark:border-slate-600" />
                    <div><Label htmlFor="sell-quantity">Quantity to Sell</Label><Input id="sell-quantity" type="number" value={quantity} onChange={e => setQuantity(Math.min(stock.quantity, Number(e.target.value)))} max={stock.quantity} min="1" /></div>
                    <p>Estimated Profit/Loss: <span className={profit >= 0 ? 'font-bold text-emerald-500' : 'font-bold text-red-500'}>₹{profit.toFixed(2)}</span></p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setStockToSell(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleSell}>Confirm Sell</Button>
                </CardFooter>
            </AnimatedCard>
        </div>
    );
};
SellModal.propTypes = { stockToSell: PropTypes.string, setStockToSell: PropTypes.func.isRequired };

const TradeCard = ({ stockData }) => {
    const { user, portfolio, setPortfolio, funds, setFunds, showToast, setStockToSell, logTransaction, exchangeRate } = useAppContext();
    const [quantity, setQuantity] = useState(1);
    const ownsStock = portfolio.some(stock => stock.ticker === stockData.ticker);
    const isForeign = !stockData.ticker.toUpperCase().endsWith('.NS');
    const costInUSD = stockData.currentPrice * quantity;
    const costInINR = costInUSD * (isForeign ? exchangeRate : 1);

    const handleBuy = () => {
        if (quantity <= 0) { showToast("Please enter a valid quantity.", "error"); return; }
        if (costInINR > funds) { showToast(`Insufficient funds. You need ₹${costInINR.toFixed(2)}.`, "error"); return; }
        setFunds(prev => prev - costInINR);
        setPortfolio(prev => {
            const existing = prev.find(s => s.ticker === stockData.ticker);
            if (existing) return prev.map(s => s.ticker === stockData.ticker ? { ...s, quantity: s.quantity + quantity, purchasePrice: ((s.purchasePrice * s.quantity) + (stockData.currentPrice * quantity)) / (s.quantity + quantity) } : s);
            return [...prev, { id: Date.now(), ticker: stockData.ticker, quantity, purchasePrice: stockData.currentPrice }];
        });
        logTransaction('BUY', stockData.ticker, quantity, stockData.currentPrice);
        showToast(`Successfully bought ${quantity} share(s) of ${stockData.ticker}! 🎉`, "success");
    };
    return (
        <AnimatedCard className="card-style">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShoppingCart /> Trade {stockData.ticker}</CardTitle>
                {isForeign && <p className="text-sm text-gray-500">Rate: 1 USD ≈ ₹{exchangeRate.toFixed(2)}</p>}
                {user.isPracticeMode && <p className="text-sm text-amber-500 font-semibold">Practice Mode</p>}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-end gap-4">
                    <div className="flex-grow"><Label htmlFor="quantity">Quantity</Label><Input id="quantity" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="1" placeholder="Qty" /></div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Total Cost</p>
                        <p className="text-xl font-bold">₹{costInINR.toFixed(2)}</p>
                        {isForeign && <p className="text-xs text-gray-400">(${costInUSD.toFixed(2)})</p>}
                    </div>
                </div>
                <div className="flex gap-2 w-full pt-4">
                    <Button onClick={handleBuy} className="w-full bg-emerald-600 hover:bg-emerald-700"><CheckCircle className="mr-2" /> {ownsStock ? 'Buy More' : 'Buy'}</Button>
                    <Button onClick={() => setStockToSell(stockData.ticker)} variant="destructive" className="w-full" disabled={!ownsStock}><XCircle className="mr-2" /> Sell</Button>
                </div>
            </CardContent>
        </AnimatedCard>
    );
};
TradeCard.propTypes = { stockData: PropTypes.object.isRequired };

const GuestPrompt = () => {
    const navigate = useNavigate();
    return (
        <AnimatedCard className="text-center py-20 card-style">
            <Brain className="mx-auto h-16 w-16 text-indigo-300" />
            <h2 className="mt-4 text-2xl font-semibold">Premium Feature</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">This feature is available for registered users. Please create an account or sign in to get access.</p>
            <div className="mt-6 flex justify-center gap-4">
                <Button onClick={() => navigate('/login')}><LogIn className="mr-2" /> Log In or Sign Up</Button>
            </div>
        </AnimatedCard>
    );
};


const CandlestickChartComponent = ({ data, timeFilter }) => {
    const chartContainerRef = useRef(null);
    
    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return;
    
        const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    
        const chart = createChart(chartContainerRef.current, {
            layout: { background: { color: 'transparent' }, textColor: document.body.classList.contains('dark') ? '#DDD' : '#333' },
            grid: { vertLines: { color: 'rgba(197, 203, 206, 0.2)' }, horzLines: { color: 'rgba(197, 203, 206, 0.2)' } },
            width: chartContainerRef.current.clientWidth,
            height: 384,
        });
    
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a', downColor: '#ef5350', borderDownColor: '#ef5350',
            borderUpColor: '#26a69a', wickDownColor: '#ef5350', wickUpColor: '#26a69a',
        });
    
        const getTimestamp = (item) => {
            const date = new Date(item.Date);
            if (timeFilter === '1D') {
                return date.getTime() / 1000;
            }
            return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 1000;
        };
        
        const processedData = [...new Map(data.map(item => [getTimestamp(item), item])).values()]
            .map(item => ({
                time: getTimestamp(item),
                open: item.Open,
                high: item.High,
                low: item.Low,
                close: item.Close,
            }))
            .sort((a, b) => a.time - b.time);
    
        candlestickSeries.setData(processedData);
        chart.timeScale().fitContent();
        window.addEventListener('resize', handleResize);
    
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, timeFilter]);
    
    return <div ref={chartContainerRef} className="w-full h-96" />;
};
CandlestickChartComponent.propTypes = { data: PropTypes.array.isRequired, timeFilter: PropTypes.string.isRequired };

const LineChartComponent = ({ data, currency, isPositive, timeFilter }) => {
    return (
        <div className="w-full h-96">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis dataKey="Date" tickFormatter={(time) => timeFilter === '1D' ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(time).toLocaleDateString()} />
                    <YAxis domain={['dataMin', 'dataMax']} tickFormatter={(price) => `${currency}${Math.round(price)}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Close" stroke={isPositive ? "#10b981" : "#ef4444"} fill="url(#colorPrice)" name="Price" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
LineChartComponent.propTypes = { data: PropTypes.array.isRequired, currency: PropTypes.string.isRequired, isPositive: PropTypes.bool.isRequired, timeFilter: PropTypes.string.isRequired };

// --- PAGE COMPONENTS ---

const AuthPage = () => {
    const { setUser } = useAppContext();
    const navigate = useNavigate();
    const [authMode, setAuthMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async () => {
        setError(''); setLoading(true);
        if (authMode === 'signup') {
            if (password !== confirmPassword) { setError("Passwords do not match."); setLoading(false); return; }
            if (!username || !password) { setError("Username and password cannot be empty."); setLoading(false); return; }
            try { await apiCall('/signup', 'POST', { username, password }); alert("Sign up successful! Please log in."); setAuthMode('login'); }
            catch (err) { setError(err.message); }
        } else {
            if (!username || !password) { setError("Username and password cannot be empty."); setLoading(false); return; }
            try { const result = await apiCall('/login', 'POST', { username, password }); setUser(result); navigate("/"); }
            catch (err) { setError(err.message); }
        }
        setLoading(false);
    };
    const handleGuest = () => { setUser({ username: 'guest', isPracticeMode: true }); navigate("/"); };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <AnimatedCard className="w-full max-w-md card-style">
                <CardHeader><CardTitle className="text-2xl text-center">{authMode === 'login' ? 'Log In' : 'Sign Up'}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div><Label htmlFor="username">Username</Label><AnimatedInput id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter a username" /></div>
                    <div><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && handleAuthAction()} /></div>
                    {authMode === 'signup' && (<div><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" onKeyDown={(e) => e.key === 'Enter' && handleAuthAction()} /></div>)}
                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                    <div className="space-y-2">
                        <GlowButton onClick={handleAuthAction} disabled={loading} className="w-full">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (authMode === 'login' ? <><LogIn className="mr-2" />Log In</> : <><UserPlus className="mr-2" />Create Account</>)}</GlowButton>
                        <Button variant="link" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>{authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}</Button>
                    </div>
                    <div className="relative my-4"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-50 px-2 text-gray-500 dark:bg-slate-900">Or</span></div></div>
                    <Button variant="outline" onClick={handleGuest} className="w-full">Continue as Guest (Practice Mode)</Button>
                </CardContent>
            </AnimatedCard>
        </div>
    );
};

const HomePage = () => {
    const { portfolio, user, setTickerInput, handleAnalyze, allTickers, tickerInput, loading, exchangeRate } = useAppContext();
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState({ totalPL: 0, todayPL: 0, totalInvested: 0, loading: true });

    useEffect(() => {
        const fetchMetrics = async () => {
            if (portfolio.length === 0) {
                setMetrics({ totalPL: 0, todayPL: 0, totalInvested: 0, loading: false });
                return;
            }
            setMetrics(prev => ({ ...prev, loading: true }));
            const tickers = portfolio.map(s => s.ticker);
            try {
                const data = await apiCall('/portfolio-data', 'POST', { tickers });
                let totalPL = 0;
                let todayPL = 0;
                let totalInvested = 0;

                portfolio.forEach(stock => {
                    const liveInfo = data[stock.ticker];
                    if (liveInfo) {
                        const rate = stock.ticker.toUpperCase().endsWith('.NS') ? 1 : exchangeRate;
                        const investedAmount = stock.purchasePrice * stock.quantity * rate;
                        const currentValue = liveInfo.currentPrice * stock.quantity * rate;
                        const dayChange = liveInfo.change * stock.quantity * rate;
                        
                        totalInvested += investedAmount;
                        totalPL += (currentValue - investedAmount);
                        todayPL += dayChange;
                    }
                });
                setMetrics({ totalPL, todayPL, totalInvested, loading: false });
            } catch (err) {
                console.error("Failed to fetch metrics", err);
                setMetrics({ totalPL: 0, todayPL: 0, totalInvested: 0, loading: false });
            }
        };

        if (portfolio.length > 0) {
            fetchMetrics();
            const interval = setInterval(fetchMetrics, 30000);
            return () => clearInterval(interval);
        } else {
             setMetrics({ totalPL: 0, todayPL: 0, totalInvested: 0, loading: false });
        }

    }, [portfolio, exchangeRate]);

    return (
        <div className="space-y-6">
            <AnimatedCard className="card-style">
                <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Search /> Stock Analysis</CardTitle></CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4 items-center">
                    <StockSearchInput value={tickerInput} onChange={setTickerInput} onSelect={(s) => { handleAnalyze(s); navigate('/chart'); }} allTickers={allTickers} />
                    <GlowButton onClick={() => { if (tickerInput) { handleAnalyze(tickerInput); navigate('/chart'); } }} disabled={loading || !tickerInput}><Search className="mr-2 h-5 w-5" /> Analyze</GlowButton>
                </CardContent>
            </AnimatedCard>
            <AnimatedCard className="card-style">
                <CardHeader><CardTitle className="flex items-center gap-2 text-2xl"><Home /> Your Dashboard</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    {user.isPracticeMode && <Alert variant="default" className="bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700"><AlertDescription className="text-amber-700 dark:text-amber-300">You are in **Practice Mode**. All trades are simulated with paper money.</AlertDescription></Alert>}
                    
                    <div className="p-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                        <p className="text-gray-500 dark:text-gray-400">Total Invested</p>
                        {metrics.loading ? <Skeleton className="h-10 w-48 mx-auto mt-1" /> : <p className="text-4xl font-bold">₹{metrics.totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {metrics.loading ? <>
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </> : <>
                            <MetricCard title="Total Profit/Loss" value={`₹${metrics.totalPL.toFixed(2)}`} valueClassName={metrics.totalPL >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                            <MetricCard title="Today's Profit/Loss" value={`₹${metrics.todayPL.toFixed(2)}`} valueClassName={metrics.todayPL >= 0 ? 'text-emerald-500' : 'text-red-500'} />
                        </>}
                    </div>

                    <NavLink to="/portfolio" className="flex items-center justify-between p-4 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
                        <div><h3 className="font-bold text-lg">My Portfolio</h3><p className="text-sm text-gray-500">{portfolio.length} holding(s)</p></div><ArrowRight className="h-6 w-6" />
                    </NavLink>
                </CardContent>
            </AnimatedCard>
        </div>
    );
};


const PortfolioPage = () => {
    const { user, portfolio, handleAnalyze, exchangeRate } = useAppContext();
    const [liveData, setLiveData] = useState({});
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLiveData = async () => {
            if (portfolio.length === 0) { setLoading(false); return; }
            setLoading(true);
            const tickers = portfolio.map(s => s.ticker);
            try { 
                const data = await apiCall('/portfolio-data', 'POST', { tickers }); 
                setLiveData(data); 
            }
            catch (error) { console.error("Failed to fetch live portfolio data:", error); }
            finally { setLoading(false); }
        };
        fetchLiveData();
        const interval = setInterval(fetchLiveData, 30000);
        return () => clearInterval(interval);
    }, [portfolio]);

    const handleStockClick = (ticker) => { handleAnalyze(ticker); navigate('/chart'); };

    if (loading && portfolio.length > 0) return <div className="space-y-4">{Array(portfolio.length).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full card-style" />)}</div>;

    return (
        <AnimatedCard className="card-style">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl">
                    <div className="flex items-center gap-2"><Briefcase /> My Investments</div>
                    {user.isPracticeMode && <div className="text-sm font-semibold text-amber-500 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50">Practice Mode</div>}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {portfolio.length === 0 ? (
                    <p className="text-center text-gray-500 py-10">Your portfolio is empty. Analyze a stock and use the &apos;Buy&apos; option to add investments.</p>
                ) : (
                    <div className="space-y-3">{portfolio.map(stock => {
                        const isForeign = !stock.ticker.toUpperCase().endsWith('.NS');
                        const rate = isForeign ? exchangeRate : 1;
                        const currency = getCurrency(stock.ticker);
                        
                        const investedAmount = stock.purchasePrice * stock.quantity * rate;
                        const currentPrice = liveData[stock.ticker]?.currentPrice || 0;
                        const currentValue = currentPrice * stock.quantity * rate;
                        const pnl = currentPrice > 0 ? currentValue - investedAmount : 0;
                        const isProfit = pnl >= 0;

                        return (
                            <div key={stock.id} onClick={() => handleStockClick(stock.ticker)} className="block p-4 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                <div className="flex justify-between items-center">
                                    <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400">{stock.ticker}</p>
                                    <p className={`font-semibold ${isProfit ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {isProfit ? '+' : ''}₹{pnl.toFixed(2)}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 mt-1">
                                    <p>Qty: {stock.quantity.toLocaleString()}</p>
                                    <p>Invested (INR): ₹{investedAmount.toFixed(2)}</p>
                                </div>
                                <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                                     <p>Avg. Price: {currency}{stock.purchasePrice.toFixed(2)}</p>
                                     <p>Current Price: {currency}{currentPrice.toFixed(2)}</p>
                                </div>
                            </div>);
                    })}
                    </div>)}
            </CardContent>
        </AnimatedCard>
    );
};

const ChartPage = () => {
    const { stockData, loading, isReloading, error, timeFilter, setTimeFilter, darkMode, chartType, setChartType } = useAppContext();
    if (loading && !isReloading) return <div className="space-y-6"><Skeleton className="h-96 w-full card-style" /><Skeleton className="h-64 w-full card-style" /></div>;
    if (error) return <AnimatedCard className="card-style"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></AnimatedCard>;
    if (!stockData) return (<AnimatedCard className="text-center py-20 card-style"><TrendingUp className="mx-auto h-16 w-16 text-indigo-300" /><h2 className="mt-4 text-2xl font-semibold">No Stock Analyzed</h2><p className="mt-2 text-gray-500 dark:text-gray-400">Go to the Home page to search for a stock.</p></AnimatedCard>);

    const { priceChange, percentageChange, isPositive } = (() => {
        const { currentPrice, previousClose, data } = stockData;
        if (timeFilter === '1D' && currentPrice && previousClose) {
            const change = currentPrice - previousClose;
            const percentChange = previousClose > 0 ? (change / previousClose) * 100 : 0;
            return { priceChange: change, percentageChange: percentChange, isPositive: change >= 0 };
        }
        if (data.length < 2) return { priceChange: 0, percentageChange: 0, isPositive: true };
        const firstPrice = data[0]?.Open;
        const lastPrice = data[data.length - 1]?.Close;
        if (firstPrice == null || lastPrice == null) return { priceChange: 0, percentageChange: 0, isPositive: true };
        const change = lastPrice - firstPrice;
        const percentChange = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
        return { priceChange: change, percentageChange: percentChange, isPositive: change >= 0 };
    })();

    const currency = getCurrency(stockData.ticker);

    return (
        <div className="space-y-6 animate-fade-in relative">
            {isReloading && <div className="absolute inset-0 bg-slate-500/10 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Loader2 className="h-10 w-10 animate-spin text-indigo-500" /></div>}
            <AnimatedCard className="card-style">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="flex items-center gap-3 text-2xl font-bold">{stockData.ticker} Price Action</CardTitle>
                            <div className="flex items-baseline gap-4 mt-2">
                                <p className="text-4xl font-bold">{currency}{stockData.currentPrice.toFixed(2)}</p>
                                <p className={`text-xl font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{percentageChange.toFixed(2)}%)
                                    <span className="text-xs ml-2 text-gray-400"> ({timeFilter})</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                            <Button size="icon" variant={chartType === 'line' ? 'secondary' : 'ghost'} onClick={() => setChartType('line')}><LineChartIcon className="h-5 w-5" /></Button>
                            <Button size="icon" variant={chartType === 'candle' ? 'secondary' : 'ghost'} onClick={() => setChartType('candle')}><CandlestickChart className="h-5 w-5" /></Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {chartType === 'candle' ? (
                        <CandlestickChartComponent data={stockData.data} timeFilter={timeFilter} />
                    ) : (
                        <LineChartComponent data={stockData.data.map(d => ({ ...d, Ticker: stockData.ticker, Date: new Date(d.Date).getTime() }))} currency={currency} isPositive={isPositive} timeFilter={timeFilter} />
                    )}
                </CardContent>
                <CardFooter className="flex-wrap justify-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">{["1D", "1W", "1M", "6M", "1Y", "ALL"].map(p => <Button key={p} className="time-filter-btn" data-state={timeFilter === p ? 'active' : 'inactive'} variant="outline" onClick={() => setTimeFilter(p)}>{p}</Button>)}</CardFooter>
            </AnimatedCard>
            <TradeCard stockData={stockData} />
        </div>
    );
};

const IndicatorSettingsCard = ({ activeIndicators, setActiveIndicators, onRunAnalysis, isLoading, ticker, timeFilter, setTimeFilter }) => {
    const available = [
        { name: "SMA", params: { period: 20 } },
        { name: "EMA", params: { period: 20 } },
        { name: "DEMA", params: { period: 20 } },
        { name: "EMACross", params: { fast: 10, slow: 30 } },
        { name: "RSI", params: { period: 14 } },
        { name: "StochRSI", params: { rsi_period: 14, stoch_period: 14 } },
        { name: "MACD", params: { fast: 12, slow: 26, signal: 9 } },
        { name: "BBands", params: { period: 20, std_dev: 2 } },
        { name: "BBands_%B", params: { period: 20, std_dev: 2 } },
        { name: "StdDev", params: { period: 20 } },
        { name: "Klinger", params: { fast: 34, slow: 55, signal: 13 } },
        { name: "LinReg", params: { period: 14 } },
        { name: "TSI", params: { long: 25, short: 13 } },
        { name: "OBV", params: {} },
    ];

    const addIndicator = (indicatorName) => {
        if (!indicatorName) return;
        const indicatorToAdd = available.find(ind => ind.name === indicatorName);
        if (indicatorToAdd) {
            setActiveIndicators(prev => [...prev, { ...indicatorToAdd, id: Date.now() }]);
        }
    };

    const removeIndicator = (id) => {
        setActiveIndicators(prev => prev.filter(ind => ind.id !== id));
    };

    const updateParam = (id, paramName, value) => {
        setActiveIndicators(prev => prev.map(ind =>
            ind.id === id ? { ...ind, params: { ...ind.params, [paramName]: Number(value) } } : ind
        ));
    };

    return (
        <AnimatedCard className="card-style">
            <CardHeader>
                 <CardTitle className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xl"><Calculator /> Indicator Settings for {ticker || '...'}</div>
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                        {["1D", "1W", "1M", "6M", "1Y", "ALL"].map(p => <Button className="time-filter-btn" data-state={timeFilter === p ? 'active' : 'inactive'} size="sm" key={p} variant="ghost" onClick={() => setTimeFilter(p)}>{p}</Button>)}
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeIndicators.map(ind => (
                        <div key={ind.id} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
                            <div className="flex justify-between items-center">
                                <p className="font-bold">{ind.name}</p>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeIndicator(ind.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(ind.params).map(([key, value]) => (
                                    <div key={key}>
                                        <Label htmlFor={`${ind.id}-${key}`} className="text-xs capitalize">{key.replace('_', ' ')}</Label>
                                        <Input id={`${ind.id}-${key}`} type="number" value={value} onChange={e => updateParam(ind.id, key, e.target.value)} className="h-8" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="pt-4 border-t dark:border-slate-700 flex items-center gap-4 flex-wrap">
                    <p className="font-semibold mr-2">Add Indicator:</p>
                     <select 
                        onChange={(e) => addIndicator(e.target.value)} 
                        value=""
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm"
                     >
                        <option value="" disabled>Select an indicator...</option>
                        {available.map(ind => (
                             <option key={ind.name} value={ind.name}>{ind.name}</option>
                        ))}
                    </select>
                 </div>
            </CardContent>
            <CardFooter>
                 <GlowButton onClick={onRunAnalysis} disabled={isLoading || !ticker} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><TrendingUp className="mr-2 h-4 w-4" /> Apply & Analyze</>}
                </GlowButton>
            </CardFooter>
        </AnimatedCard>
    );
};
IndicatorSettingsCard.propTypes = {
    activeIndicators: PropTypes.array.isRequired,
    setActiveIndicators: PropTypes.func.isRequired,
    onRunAnalysis: PropTypes.func.isRequired,
    isLoading: PropTypes.bool.isRequired,
    ticker: PropTypes.string,
    timeFilter: PropTypes.string.isRequired,
    setTimeFilter: PropTypes.func.isRequired,
};

const IndicatorPage = () => {
    const { stockData, loading, error, user, fetchStockData, timeFilter, setTimeFilter, analyzedTicker, indicatorPageConfig, configureIndicatorPage } = useAppContext();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const defaultIndicators = [
        { id: 1, name: "SMA", params: { period: 50 } },
        { id: 2, name: "EMA", params: { period: 20 } },
        { id: 3, name: "RSI", params: { period: 14 } },
        { id: 4, name: "MACD", params: { fast: 12, slow: 26, signal: 9 } },
    ];
    
    const [activeIndicators, setActiveIndicators] = useState(defaultIndicators);

    const runAnalysis = useCallback(async (ticker, period, indicators) => {
        setIsAnalyzing(true);
        const indicatorsForApi = indicators.map(({ name, params }) => ({ name, params }));
        await fetchStockData(ticker, period, false, indicatorsForApi);
        setIsAnalyzing(false);
    }, [fetchStockData]);

    useEffect(() => {
        if (indicatorPageConfig) {
            const { ticker, period, indicators } = indicatorPageConfig;
            setActiveIndicators(indicators.map(ind => ({ ...ind, id: Date.now() + Math.random() })));
            setTimeFilter(period);
            runAnalysis(ticker, period, indicators);
            configureIndicatorPage(null); // Clear the config after use
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [indicatorPageConfig]);


    const handleRunAnalysisFromUI = () => {
        if (!analyzedTicker) return;
        runAnalysis(analyzedTicker, timeFilter, activeIndicators);
    };

    if (user.isPracticeMode) return <GuestPrompt />;
    if ((loading || isAnalyzing) && !stockData) return <div className="space-y-6"><Skeleton className="h-40 w-full card-style" /><Skeleton className="h-80 w-full card-style" /></div>;
    if (error) return <AnimatedCard className="card-style"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert></AnimatedCard>;
    if (!analyzedTicker) return (<AnimatedCard className="text-center py-20 card-style"><TrendingUp className="mx-auto h-16 w-16 text-indigo-300" /><h2 className="mt-4 text-xl font-semibold">No Stock Selected</h2><p className="mt-2 text-gray-500 dark:text-gray-400">Analyze a stock from the Home or Chart page first.</p></AnimatedCard>);

    const chartData = stockData?.data.map(d => ({ ...d, Date: new Date(d.Date).getTime() })) || [];
    const availableIndicatorKeys = chartData.length > 0 ? Object.keys(chartData[0]) : [];

    const currency = getCurrency(stockData?.ticker);
    const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F', '#FFBB28', '#FF8042'];

    const IndicatorChart = ({ title, dataKeys, yAxisLabel, ChartComponent = LineChart }) => (
        <AnimatedCard className="card-style">
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ChartComponent data={chartData} syncId="indicatorSync">
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                        <XAxis dataKey="Date" tickFormatter={(time) => new Date(time).toLocaleDateString()} />
                        <YAxis tickFormatter={(val) => `${yAxisLabel || ''}${val.toFixed(1)}`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {dataKeys.map((key, index) => (
                           <Line key={key} type="monotone" dataKey={key} stroke={chartColors[index % chartColors.length]} dot={false} name={key} />
                        ))}
                    </ChartComponent>
                </ResponsiveContainer>
            </CardContent>
        </AnimatedCard>
    );
    IndicatorChart.propTypes = { title: PropTypes.string, dataKeys: PropTypes.array, yAxisLabel: PropTypes.string, ChartComponent: PropTypes.elementType };
    
    const MACDChart = () => (
         <AnimatedCard className="card-style">
            <CardHeader><CardTitle>MACD</CardTitle></CardHeader>
            <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} syncId="indicatorSync">
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                        <XAxis dataKey="Date" tickFormatter={(time) => new Date(time).toLocaleDateString()} />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="MACD_Hist" barSize={20} fill="#6366f1" name="Histogram" />
                        <Line type="monotone" dataKey="MACD" stroke="#ff7300" dot={false} name="MACD Line" />
                        <Line type="monotone" dataKey="MACD_Signal" stroke="#82ca9d" dot={false} name="Signal Line" />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </AnimatedCard>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <IndicatorSettingsCard 
                activeIndicators={activeIndicators}
                setActiveIndicators={setActiveIndicators}
                onRunAnalysis={handleRunAnalysisFromUI}
                isLoading={isAnalyzing}
                ticker={analyzedTicker}
                timeFilter={timeFilter}
                setTimeFilter={setTimeFilter}
            />
            {(isAnalyzing || loading) && <Skeleton className="h-80 w-full rounded-lg" />}

            {stockData && !isAnalyzing && !loading &&(
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatedCard className="card-style lg:col-span-2">
                        <CardHeader><CardTitle>{stockData.ticker} Price & Moving Averages</CardTitle></CardHeader>
                        <CardContent className="h-96">
                             <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} syncId="indicatorSync">
                                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                                    <XAxis dataKey="Date" tickFormatter={(time) => new Date(time).toLocaleDateString()} />
                                    <YAxis tickFormatter={(price) => `${currency}${Math.round(price)}`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="Close" stroke="#3b82f6" dot={false} name="Price" />
                                    {availableIndicatorKeys.filter(k => k.startsWith('SMA_') || k.startsWith('EMA_') || k.startsWith('DEMA_') || k.startsWith('LinReg_')).map((key, i) => (
                                        <Line key={key} type="monotone" dataKey={key} stroke={chartColors[i % chartColors.length]} dot={false} name={key} />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </AnimatedCard>

                    {availableIndicatorKeys.includes('RSI') && <IndicatorChart title="RSI" dataKeys={['RSI']} />}
                    {availableIndicatorKeys.includes('StochRSI') && <IndicatorChart title="Stochastic RSI" dataKeys={['StochRSI']} />}
                    {availableIndicatorKeys.includes('MACD') && <MACDChart />}
                    {availableIndicatorKeys.includes('BB_Upper') && <IndicatorChart title="Bollinger Bands" dataKeys={['BB_Upper', 'BB_Middle', 'BB_Lower']} yAxisLabel={currency} />}
                    {availableIndicatorKeys.includes('Klinger') && <IndicatorChart title="Klinger Oscillator" dataKeys={['Klinger', 'Klinger_Signal']} />}
                    {availableIndicatorKeys.includes('TSI') && <IndicatorChart title="True Strength Index" dataKeys={['TSI']} />}
                    {availableIndicatorKeys.includes('BB_%B') && <IndicatorChart title="Bollinger Bands %B" dataKeys={['BB_%B']} />}
                    {availableIndicatorKeys.includes('OBV') && <IndicatorChart title="On-Balance Volume (OBV)" dataKeys={['OBV']} />}
                 </div>
            )}
        </div>
    );
};

const PredictionPage = () => {
    const { stockData, loading: appLoading, user } = useAppContext();
    if (user.isPracticeMode) return <GuestPrompt />;
    if (appLoading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full card-style" />)}</div>;
    if (!stockData) return <AnimatedCard className="card-style"><Alert><AlertDescription className="text-center py-10">Analyze a stock on the Home page to see its AI Prediction.</AlertDescription></Alert></AnimatedCard>;
    const currency = getCurrency(stockData.ticker);
    const getStatus = (status) => { if (status === 'BUY') return { color: 'text-green-400', Icon: CheckCircle }; if (status === 'SELL') return { color: 'text-red-400', Icon: XCircle }; return { color: 'text-yellow-400', Icon: MinusCircle }; };
    return (
        <AnimatedCard className="card-style">
            <CardHeader><CardTitle className="flex items-center gap-2 text-xl"><Brain /> AI Prediction for {stockData.ticker}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stockData.prediction ? (<>
                    <MetricCard title="AI Recommendation" value={stockData.prediction.trade_status} Icon={getStatus(stockData.prediction.trade_status).Icon} valueClassName={getStatus(stockData.prediction.trade_status).color} />
                    <MetricCard title="Predicted Next Price" value={`${currency}${stockData.prediction.nextDayPrice.toFixed(2)}`} Icon={DollarSign} />
                    <MetricCard title="Current Price" value={`${currency}${stockData.currentPrice.toFixed(2)}`} Icon={DollarSign} />
                    <MetricCard title="Model Confidence" value={`${(stockData.prediction.accuracy * 100).toFixed(1)}%`} Icon={Target} />
                    <MetricCard title="News Sentiment" value={`${(stockData.prediction.sentiment * 100).toFixed(1)}% Positive`} Icon={Heart} />
                    <MetricCard title="P/E Ratio" value={stockData.peRatio > 0 ? stockData.peRatio.toFixed(2) : 'N/A'} Icon={Calculator} />
                </>) : (<div className="md:col-span-2 lg:col-span-3"><Alert variant="destructive"><AlertDescription>Could not load prediction data for this stock.</AlertDescription></Alert></div>)}
            </CardContent>
        </AnimatedCard>
    );
};

const NewsPage = () => {
    const { stockData } = useAppContext();
    const [generalNews, setGeneralNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!stockData) {
            const fetchGeneralNews = async () => {
                setLoading(true);
                try {
                    const news = await apiCall("/general-news");
                    setGeneralNews(news);
                } catch (error) {
                    console.error("Failed to fetch general news:", error);
                }
                setLoading(false);
            };
            fetchGeneralNews();
        } else {
            setLoading(false);
        }
    }, [stockData]);

    const news = stockData?.news || generalNews;
    const title = stockData ? `Latest News for ${stockData.ticker}` : "Latest Financial News";

    if (loading) return <div className="space-y-4">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full card-style" />)}</div>;
    if (news.length === 0) return <AnimatedCard className="card-style"><Alert><AlertDescription className="text-center py-10">No news available at the moment.</AlertDescription></Alert></AnimatedCard>;

    return (
        <AnimatedCard className="card-style">
            <CardHeader><CardTitle className="flex items-center gap-2"><Newspaper /> {title}</CardTitle></CardHeader>
            <CardContent className="space-y-4">{news.map((item, index) => (
                <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" className="block p-4 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <LinkIcon className="h-4 w-4 flex-shrink-0" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.summary} - <span className="font-medium">{item.date}</span></p>
                </a>
            ))}</CardContent>
        </AnimatedCard>
    );
};

const ExportPage = () => {
    const { stockData, user } = useAppContext();
    const [startDate, setStartDate] = useState("2023-01-01");
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [exportLoading, setExportLoading] = useState(false);

    if (user.isPracticeMode) return <GuestPrompt />;
    const ticker = stockData?.ticker;

    const handleExport = () => {
        if (!ticker) { return; }
        setExportLoading(true);
        const API_URL = "https://stockiqapp.onrender.com";
        window.location.href = `${API_URL}/export?ticker=${ticker}&startDate=${startDate}&endDate=${endDate}`;
        setTimeout(() => setExportLoading(false), 2000);
    };
    return (<AnimatedCard className="card-style"><CardHeader><CardTitle className="flex items-center gap-2"><Download /> Export Stock Data</CardTitle><p className="text-sm text-gray-500">Export historical data with all calculated indicators to a CSV file.</p></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label htmlFor="start-date">Start Date</Label><Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div><div><Label htmlFor="end-date">End Date</Label><Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div></div><GlowButton onClick={handleExport} disabled={exportLoading || !ticker}>{exportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Export {ticker || ''} Data</GlowButton></CardContent></AnimatedCard>);
};

const SIPCalculatorPage = () => {
    const { user } = useAppContext();
    const [monthlyInvestment, setMonthlyInvestment] = useState(5000);
    const [expectedReturn, setExpectedReturn] = useState(12);
    const [timePeriod, setTimePeriod] = useState(10);

    if (user.isPracticeMode) return <GuestPrompt />;

    const calculateSIP = () => {
        const i = (expectedReturn / 100) / 12; const n = timePeriod * 12; const M = monthlyInvestment;
        if (i === 0) return { futureValue: M * n, investedAmount: M * n, estimatedReturns: 0 };
        const futureValue = M * (((Math.pow(1 + i, n) - 1) / i) * (1 + i));
        const investedAmount = M * n;
        const estimatedReturns = futureValue - investedAmount;
        return { futureValue, investedAmount, estimatedReturns };
    };
    const { futureValue, investedAmount, estimatedReturns } = calculateSIP();
    const pieData = [{ name: 'Invested', value: investedAmount }, { name: 'Returns', value: estimatedReturns }];
    const COLORS = ['#8884d8', '#82ca9d'];
    return (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><AnimatedCard className="card-style"><CardHeader><CardTitle className="flex items-center gap-2"><Calculator /> SIP Calculator</CardTitle></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="monthly-investment">Monthly Investment (₹)</Label><Input id="monthly-investment" type="number" value={monthlyInvestment} onChange={e => setMonthlyInvestment(Number(e.target.value))} /></div><div><Label htmlFor="expected-return">Expected Return Rate (% p.a.)</Label><Input id="expected-return" type="number" value={expectedReturn} onChange={e => setExpectedReturn(Number(e.target.value))} /></div><div><Label htmlFor="time-period">Time Period (Years)</Label><Input id="time-period" type="number" value={timePeriod} onChange={e => setTimePeriod(Number(e.target.value))} /></div></CardContent></AnimatedCard><AnimatedCard className="card-style"><CardHeader><CardTitle>Projected Value</CardTitle></CardHeader><CardContent className="flex flex-col items-center justify-center"><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><RechartsPieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} /><Legend /></RechartsPieChart></ResponsiveContainer></div><div className="text-center space-y-3 mt-4"><p className="text-lg">Invested Amount: <span className="font-bold text-indigo-400">₹{investedAmount.toLocaleString('en-IN')}</span></p><p className="text-lg">Est. Returns: <span className="font-bold text-emerald-400">₹{estimatedReturns.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></p><p className="text-2xl font-bold">Future Value: <span className="text-green-500">₹{futureValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></p></div></CardContent></AnimatedCard></div>);
};

const BacktestingPage = () => {
    const { stockData, user } = useAppContext();
    const [params, setParams] = useState({ holding_days: 10, min_score: 70, stop_loss_pct: 5, take_profit_pct: 10 });
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    if (user.isPracticeMode) return <GuestPrompt />;

    const ticker = stockData?.ticker;
    const handleRunBacktest = async () => {
        if (!ticker) return;
        setLoading(true); setResults(null);
        try { const data = await apiCall('/backtest', 'POST', { ticker, ...params }); setResults(data); }
        catch (err) { alert(err.message); }
        finally { setLoading(false); }
    };
    return (<div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><AnimatedCard className="card-style lg:col-span-1"><CardHeader><CardTitle className="flex items-center gap-2"><ChevronsRight /> Backtest Strategy</CardTitle><p className="text-sm text-gray-500">Test a generic scoring strategy on historical data for <span className="font-bold">{ticker || '...'}</span>.</p></CardHeader><CardContent className="space-y-4"><div><Label>Min. Score to Buy</Label><Input type="number" value={params.min_score} onChange={e => setParams(p => ({ ...p, min_score: Number(e.target.value) }))} /></div><div><Label>Holding Period (Days)</Label><Input type="number" value={params.holding_days} onChange={e => setParams(p => ({ ...p, holding_days: Number(e.target.value) }))} /></div><div><Label>Take Profit (%)</Label><Input type="number" value={params.take_profit_pct} onChange={e => setParams(p => ({ ...p, take_profit_pct: Number(e.target.value) }))} /></div><div><Label>Stop Loss (%)</Label><Input type="number" value={params.stop_loss_pct} onChange={e => setParams(p => ({ ...p, stop_loss_pct: Number(e.target.value) }))} /></div></CardContent><CardFooter><GlowButton onClick={handleRunBacktest} disabled={loading || !ticker} className="w-full">{loading ? <Loader2 className="animate-spin mr-2" /> : <ChevronsRight className="mr-2" />} Run Test</GlowButton></CardFooter></AnimatedCard><AnimatedCard className="card-style lg:col-span-2"><CardHeader><CardTitle>Backtest Results</CardTitle></CardHeader><CardContent>{loading && <Skeleton className="w-full h-60" />}{!loading && !results && <div className="text-center py-20 text-gray-500">Run a backtest to see the results here.</div>}{results && (<div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"><MetricCard title="Total Trades" value={results.summary.total_trades || 0} /><MetricCard title="Win Rate" value={`${results.summary.win_rate || 0}%`} /><MetricCard title="Avg. Return" value={`${results.summary.average_return || 0}%`} /><MetricCard title="Total Return" value={`${results.summary.total_return_cumulative || 0}%`} /></div><div className="max-h-96 overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100 dark:bg-slate-800"><tr><th className="p-2">Buy Date</th><th className="p-2">Sell Date</th><th className="p-2">Return %</th><th className="p-2 hidden md:table-cell">Reason</th></tr></thead><tbody>{results.results.map((trade, i) => (<tr key={i} className="border-b dark:border-slate-700"><td className="p-2">{trade['Buy Date']}</td><td className="p-2">{trade['Sell Date']}</td><td className={`p-2 font-bold ${trade['Return (%)'] >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{trade['Return (%)'].toFixed(2)}%</td><td className="p-2 hidden md:table-cell">{trade['Exit Reason']}</td></tr>))}{results.results.length === 0 && <tr><td colSpan="4"><p className="text-center py-10 text-gray-500">No trades were executed with these parameters.</p></td></tr>}</tbody></table></div></div>)}</CardContent></AnimatedCard></div>);
};

const FundsPage = () => {
    const { user, funds, setFunds, showToast } = useAppContext();
    const [amount, setAmount] = useState(1000);
    const navigate = useNavigate();
    const handleAdd = () => { if (amount <= 0) { showToast("Please enter a valid amount.", "error"); return; } setFunds(f => f + amount); showToast(`Successfully added ₹${amount}`, "success"); };
    const handleWithdraw = () => { if (amount <= 0) { showToast("Please enter a valid amount.", "error"); return; } if (amount > funds) { showToast("Withdrawal amount cannot exceed available funds.", "error"); return; } setFunds(f => f - amount); showToast(`Successfully withdrew ₹${amount}`, "success"); };
    return (<AnimatedCard className="card-style max-w-lg mx-auto"><CardHeader>
        <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-2"><Wallet /> Funds</div>
            {user.isPracticeMode && <div className="text-sm font-semibold text-amber-500 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50">Practice Mode</div>}
        </CardTitle>
    </CardHeader><CardContent className="space-y-6"><div className="p-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-center"><p className="text-gray-500 dark:text-gray-400">Available to Invest</p><p className="text-4xl font-bold">₹{funds.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p></div><div className="flex gap-2 items-end"><div className="flex-grow"><Label htmlFor="fund-amount">Amount</Label><Input id="fund-amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} /></div><Button onClick={handleAdd}>Add</Button><Button onClick={handleWithdraw} variant="destructive">Withdraw</Button></div><Button variant="link" onClick={() => navigate('/transactions')} className="w-full"><History className="mr-2 h-4 w-4" /> View Transaction History</Button></CardContent></AnimatedCard>);
};

const TransactionsPage = () => {
    const { user, portfolio } = useAppContext();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            if (!user?.username) { setLoading(false); return; }
            try {
                const data = await apiCall(`/get-transactions?username=${user.username}`);
                setTransactions(data);
            }
            catch (err) { console.error("Failed to fetch transactions:", err); }
            finally { setLoading(false); }
        };

        if (!user.isPracticeMode) {
            fetchTransactions();
        } else {
            const guestTransactions = portfolio.map(p => ({
                type: 'BUY',
                ticker: p.ticker,
                quantity: p.quantity,
                price: p.purchasePrice,
                timestamp: new Date(p.id).toISOString()
            })).reverse();
            setTransactions(guestTransactions);
            setLoading(false);
        }
    }, [user, portfolio]);

    if (loading) return <Skeleton className="h-60 w-full card-style" />;
    return (<AnimatedCard className="card-style max-w-2xl mx-auto"><CardHeader><CardTitle className="flex items-center gap-2"><History /> Transaction History</CardTitle></CardHeader><CardContent>{transactions.length === 0 ? <p className="text-center text-gray-500 py-10">No transactions yet.</p> : (<ul className="space-y-3">{transactions.map((t, i) => { const isBuy = t.type === 'BUY'; return (<li key={i} className="flex justify-between items-center border-b pb-2 dark:border-slate-700"><div><p className="font-bold">{t.ticker} <span className={`text-sm ${isBuy ? 'text-emerald-500' : 'text-red-500'}`}>{t.type}</span></p><p className="text-xs text-gray-500">{new Date(t.timestamp).toLocaleString()}</p></div><div className="text-right"><p className="font-medium">{t.quantity} @ {getCurrency(t.ticker)}{t.price.toFixed(2)}</p><p className="text-sm">Total: {getCurrency(t.ticker)}{(t.quantity * t.price).toFixed(2)}</p></div></li>); })}</ul>)}</CardContent></AnimatedCard>);
};

const ExternalPortfolioPage = () => {
    const { user } = useAppContext();
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [syncedPortfolio, setSyncedPortfolio] = useState(null);

    if (user.isPracticeMode) return <GuestPrompt />;

    const handleConnect = () => {
        setIsLoading(true);
        setTimeout(() => {
            setSyncedPortfolio([
                { ticker: 'RELIANCE.NS', quantity: 10, avgPrice: 2800 },
                { ticker: 'TCS.NS', quantity: 15, avgPrice: 3850 },
            ]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <AnimatedCard className="card-style max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Link2 /> Track External Portfolio</CardTitle>
                <p className="text-sm text-gray-500">Connect to your broker to sync and track your holdings in real-time. (This is a UI demonstration).</p>
            </CardHeader>
            {!syncedPortfolio ? (
                <CardContent className="space-y-4">
                    <p className="font-semibold">Connect to Zerodha Kite (Example)</p>
                    <div><Label htmlFor="api-key">API Key</Label><Input id="api-key" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your API Key" /></div>
                    <div><Label htmlFor="api-secret">API Secret</Label><Input id="api-secret" type="password" value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Enter your API Secret" /></div>
                    <GlowButton onClick={handleConnect} disabled={isLoading}>{isLoading ? <Loader2 className="animate-spin mr-2" /> : "Connect & Sync"}</GlowButton>
                </CardContent>
            ) : (
                <CardContent>
                    <h3 className="font-bold text-lg mb-4">✅ Synced Portfolio</h3>
                    <div className="space-y-2">
                        {syncedPortfolio.map(stock => (
                            <div key={stock.ticker} className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <p className="font-bold">{stock.ticker}</p>
                                <p>{stock.quantity} shares @ ₹{stock.avgPrice.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                     <Button variant="link" onClick={() => setSyncedPortfolio(null)} className="w-full mt-4">Disconnect</Button>
                </CardContent>
            )}
        </AnimatedCard>
    );
};

const TradingBotPage = () => {
    const { user, chatMessages, setChatMessages, getBotResponse, botContext, setBotContext, stockData, configureIndicatorPage } = useAppContext();
    const [input, setInput] = useState('');
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [editText, setEditText] = useState("");
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatMessages]);

    useEffect(() => {
        if (chatMessages.length === 0 && !user.isPracticeMode) {
            setChatMessages([{
                id: Date.now(),
                sender: 'bot',
                text: `Hello! I am your StockIQ assistant. How can I help? You can ask me to "analyze tatasteel".`
            }]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);
    
    if (user.isPracticeMode) {
        return <GuestPrompt />;
    }

    const handleBotAction = async (action, actionData) => {
        if (action === 'NAVIGATE_TO_INDICATORS') {
            configureIndicatorPage(actionData);
            navigate('/indicators');
        }
    };

    const submitQuery = async (query) => {
        if (!query.trim()) return;
        setIsBotTyping(true);
        const botResponse = await getBotResponse(query);
        setIsBotTyping(false);

        if (botResponse) {
            if (!botResponse.isSilent) {
                setChatMessages(prev => [...prev, { id: Date.now(), sender: 'bot', ...botResponse }]);
            }
            if (botResponse.action) {
                await handleBotAction(botResponse.action, botResponse.actionData);
            }
            setBotContext(botResponse.context || null);
        }
    };
    
    const handleSend = () => {
        if (!input.trim() || isBotTyping) return;
        setChatMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: input }]);
        submitQuery(input);
        setInput('');
    };

    const handleStartEdit = (msg) => {
        setEditingMessage(msg);
        setEditText(msg.text);
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditText("");
    };

    const handleSaveEdit = () => {
        setChatMessages(prev => prev.map(m => 
            m.id === editingMessage.id ? { ...m, text: editText, isEdited: true } : m
        ));
        submitQuery(editText);
        setEditingMessage(null);
        setEditText("");
    };

    return (
        <AnimatedCard className="card-style max-w-2xl mx-auto flex flex-col h-[70vh]">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl"><Bot /> Trading Assistant</CardTitle>
                 <p className="text-sm text-gray-500">Currently analyzing: <span className="font-semibold text-indigo-400">{stockData?.ticker || 'None'}</span></p>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto pr-2 space-y-4">
                {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2 group ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'bot' && <Bot className="h-8 w-8 p-1.5 rounded-full bg-indigo-500 text-white flex-shrink-0" />}
                        
                        {editingMessage?.id === msg.id ? (
                             <div className="flex items-center gap-2 w-full">
                                <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="flex-grow" />
                                <Button size="icon" onClick={handleSaveEdit}><Check className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" onClick={handleCancelEdit}><X className="h-4 w-4" /></Button>
                            </div>
                        ) : (
                            <div className={`p-3 rounded-2xl max-w-md relative ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 rounded-bl-none'}`}>
                               <p style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: (msg.text || '').replace(/\n/g, '<br />') }} />
                               {msg.isEdited && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">(edited)</span>}
                                {msg.sender === 'user' && (
                                    <button onClick={() => handleStartEdit(msg)} className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 dark:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {isBotTyping && <div className="flex items-end gap-2">
                        <Bot className="h-8 w-8 p-1.5 rounded-full bg-indigo-500 text-white flex-shrink-0" />
                        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 rounded-bl-none">
                            <div className="typing-indicator"><span></span><span></span><span></span></div>
                        </div>
                    </div>
                }
                <div ref={messagesEndRef} />
            </CardContent>
            <CardFooter className="pt-4 border-t dark:border-slate-700">
                <div className="flex w-full items-center gap-2">
                    <Input
                        type={botContext?.type === 'AWAITING_PASSWORD' ? 'password' : 'text'}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        placeholder={botContext?.prompt || 'Ask about a stock or your portfolio...'}
                        disabled={isBotTyping}
                    />
                    <Button onClick={handleSend} disabled={isBotTyping || !input}><Send className="h-4 w-4" /></Button>
                </div>
            </CardFooter>
        </AnimatedCard>
    );
};

// --- MAIN APP WRAPPER & COMPONENT ---
const AppContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [funds, setFunds] = useState(0);
    const [darkMode, setDarkMode] = useState(false);
    const [tickerInput, setTickerInput] = useState("");
    const [analyzedTicker, setAnalyzedTicker] = useState(null);
    const [timeFilter, setTimeFilter] = useState("1M");
    const [chartType, setChartType] = useState('line');
    const [loading, setLoading] = useState(true);
    const [isReloading, setIsReloading] = useState(false);
    const [error, setError] = useState(null);
    const [stockData, setStockData] = useState(null);
    const [allTickers, setAllTickers] = useState([]);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [stockToSell, setStockToSell] = useState(null);
    const [exchangeRate, setExchangeRate] = useState(83.0);
    const [chatMessages, setChatMessages] = useState([]);
    const [botContext, setBotContext] = useState(null);
    const [indicatorPageConfig, setIndicatorPageConfig] = useState(null);

    const configureIndicatorPage = (config) => setIndicatorPageConfig(config);

    const showToast = useCallback((message, type) => { setToast({ show: true, message, type }); }, []);
    const logTransaction = (type, ticker, quantity, price) => { if (user?.username && user.username !== 'guest' && !user.isPracticeMode) { const transaction = { type, ticker, quantity: Number(quantity), price: Number(price), timestamp: new Date().toISOString() }; apiCall('/log-transaction', 'POST', { username: user.username, transaction }); } };

    const fetchStockData = useCallback(async (ticker, period, isFullReload, indicators) => {
        if (!ticker) return { success: false, data: null };
        if (isFullReload) setLoading(true); else setIsReloading(true);
        setError(null);
        
        const indicatorsToFetch = indicators || [ { name: "EMA", params: { period: 50 } } ];
        try {
            const result = await apiCall(`/analyze`, 'POST', { ticker, period, indicators: indicatorsToFetch });
            
            try {
                const predictionResult = await apiCall(`/predict?ticker=${ticker}`);
                result.prediction = predictionResult;
            } catch (predErr) {
                console.error("Could not fetch prediction data for merge:", predErr);
                result.prediction = null;
            }
            
            setStockData(result);
            setAnalyzedTicker(ticker);
            return { success: true, data: result };
        }
        catch (err) { 
            setError(err.message); 
            if(isFullReload) setStockData(null); 
            return { success: false, data: null };
        }
        finally { setLoading(false); setIsReloading(false); }
    }, []);

    const handleBuyFromBot = (details) => {
        const { ticker, quantity, price } = details;
        const isForeign = !ticker.toUpperCase().endsWith('.NS');
        const costInINR = price * quantity * (isForeign ? exchangeRate : 1);

        if (costInINR > funds) {
            showToast(`Insufficient funds for this trade.`, "error");
            return false;
        }
        setFunds(prev => prev - costInINR);
        setPortfolio(prev => {
            const existing = prev.find(s => s.ticker === ticker);
            if (existing) return prev.map(s => s.ticker === ticker ? { ...s, quantity: s.quantity + quantity, purchasePrice: ((s.purchasePrice * s.quantity) + (price * quantity)) / (s.quantity + quantity) } : s);
            return [...prev, { id: Date.now(), ticker, quantity, purchasePrice: price }];
        });
        logTransaction('BUY', ticker, quantity, price);
        showToast(`Successfully bought ${quantity} share(s) of ${ticker}! 🎉`, "success");
        return true;
    };
    
    const handleSellFromBot = (details) => {
        const { ticker, quantity, price } = details;
        const stockInPortfolio = portfolio.find(s => s.ticker === ticker);
    
        if (!stockInPortfolio || stockInPortfolio.quantity < quantity) {
            showToast(`You don't own enough shares of ${ticker} to sell.`, "error");
            return false;
        }
    
        const isForeign = !ticker.toUpperCase().endsWith('.NS');
        const saleValue = price * quantity * (isForeign ? exchangeRate : 1);
        setFunds(prev => prev + saleValue);
        setPortfolio(prev => {
            if (stockInPortfolio.quantity === quantity) {
                return prev.filter(s => s.ticker !== ticker);
            }
            return prev.map(s => s.ticker === ticker ? { ...s, quantity: s.quantity - quantity } : s);
        });
        logTransaction('SELL', ticker, quantity, price);
        showToast(`Successfully sold ${quantity} share(s) of ${ticker}!`, "success");
        return true;
    };

    const getBotResponse = useCallback(async (query) => {
        const q = query.toLowerCase().trim();

        if (botContext?.type) {
            switch (botContext.type) {
                case 'AWAITING_INDICATORS': {
                    const { ticker, period } = botContext;
                    const indicatorKeywords = [
                        { name: 'RSI', keywords: ['rsi'], params: { period: 14 } },
                        { name: 'MACD', keywords: ['macd'], params: { fast: 12, slow: 26, signal: 9 } },
                        { name: 'BBands', keywords: ['bollinger', 'bbands'], params: { period: 20, std_dev: 2 } },
                    ];
                    
                    let requestedIndicators = indicatorKeywords.filter(ik => ik.keywords.some(kw => q.includes(kw)));
                    if (q.includes('all')) {
                        requestedIndicators = indicatorKeywords;
                    }
                    
                    if (requestedIndicators.length === 0) {
                        return { text: "I couldn't find any valid indicators. Please try again (e.g., 'rsi and macd').", context: botContext };
                    }

                    const { success, data } = await fetchStockData(ticker, period, false, requestedIndicators);
                    if (!success || !data?.data?.length > 0) {
                        return { text: `Sorry, I couldn't fetch the data for ${ticker}. Please try again later.` };
                    }
                    
                    const lastDataPoint = data.data[data.data.length - 1];
                    let responseText = `Here are the latest values for **${ticker}**:\n`;
                    requestedIndicators.forEach(ind => {
                        const key = Object.keys(lastDataPoint).find(k => k.toUpperCase().startsWith(ind.name.toUpperCase()));
                        if (key && lastDataPoint[key] !== null) {
                            responseText += `\n- **${key}**: ${lastDataPoint[key].toFixed(2)}`;
                        }
                    });

                    responseText += "\n\nWould you like to see this on a graph?";
                    const newContext = { type: 'AWAITING_GRAPH_CONFIRMATION', ticker, period, indicators: requestedIndicators };
                    return { text: responseText, context: newContext };
                }
                case 'AWAITING_GRAPH_CONFIRMATION': {
                    if (['yes', 'yep', 'sure', 'ok', 'please do', 'y'].includes(q)) {
                        return { action: 'NAVIGATE_TO_INDICATORS', actionData: botContext, isSilent: true };
                    } else {
                        return { text: "Alright. Let me know if you need anything else!" };
                    }
                }
                case 'CONFIRM_TRADE': {
                    const priceMatch = q.match(/at\s*([0-9.]+)/) || q.match(/([0-9.]+)/);
                    if (q.includes("market") || q.includes("now") || q.includes("current")) {
                        const marketPriceData = await apiCall('/portfolio-data', 'POST', { tickers: [botContext.details.ticker] });
                        const marketPrice = marketPriceData[botContext.details.ticker]?.currentPrice;
                        if (!marketPrice) return { text: "Sorry, I couldn't fetch the current market price. Please try again." };
                        
                        const newDetails = { ...botContext.details, price: marketPrice };
                        return { text: `The current market price is ₹${marketPrice.toFixed(2)}. Please enter your password to confirm this trade.`, context: { type: 'AWAITING_PASSWORD', details: newDetails, prompt: 'Enter your password...' }};
                    } else if (priceMatch) {
                        const limitPrice = parseFloat(priceMatch[1]);
                        const newDetails = { ...botContext.details, price: limitPrice };
                        return { text: `Okay, I will set a limit order for ${newDetails.quantity} shares at ₹${limitPrice.toFixed(2)}. Please enter your password to confirm.`, context: { type: 'AWAITING_PASSWORD', details: newDetails, prompt: 'Enter your password...' }};
                    } else {
                        return { text: "I didn't understand. Do you want to trade at the market price or a specific limit price (e.g., 'at 55.50')?", context: botContext};
                    }
                }
                case 'AWAITING_PASSWORD': {
                    const password = query;
                    const { verified } = await apiCall('/verify-password', 'POST', { username: user.username, password });
                    if (verified) {
                        const handler = botContext.details.type === 'BUY' ? handleBuyFromBot : handleSellFromBot;
                        const success = handler(botContext.details);
                        if (success) return { text: `✅ Trade confirmed! Your order to ${botContext.details.type.toLowerCase()} ${botContext.details.quantity} ${botContext.details.ticker} has been executed.` };
                        else return { text: `⚠️ Your trade could not be completed. Please check your holdings or funds.` };
                    } else {
                        return { text: "❌ Password incorrect. Your trade has been cancelled for security." };
                    }
                }
            }
        }
        
        const parseQuery = () => {
             const lowerCaseQuery = q.replace(/[.,?]/g, '');
            const matchedTicker = allTickers.find(t => lowerCaseQuery.includes(t.split('.')[0].toLowerCase()));

            const tradeMatch = lowerCaseQuery.match(/^(buy|sell)\s*(\d+)\s*(share|shares)?\s*(of)?\s*(.*)/);
            if(tradeMatch) {
                const stockName = tradeMatch[5].trim();
                const matchedTradeTicker = allTickers.find(t => t.split('.')[0].toLowerCase() === stockName);
                if(matchedTradeTicker) return { intent: 'INITIATE_TRADE', details: { type: tradeMatch[1].toUpperCase(), quantity: parseInt(tradeMatch[2], 10), ticker: matchedTradeTicker }};
            }

            if (lowerCaseQuery.startsWith("analyze ") || lowerCaseQuery.startsWith("analyse ")) {
                 if (matchedTicker) return { intent: 'INITIATE_ANALYSIS', ticker: matchedTicker };
            }
            if (lowerCaseQuery.startsWith("price of ") || lowerCaseQuery.startsWith("what is the price of ")) {
                 if (matchedTicker) return { intent: 'GET_PRICE', ticker: matchedTicker };
            }
            if (['hi', 'hello', 'hey', 'hi da'].includes(lowerCaseQuery)) return { intent: 'GREETING' };
            if (['thanks', 'thank you', 'ok', 'cool', 'got it', 'super', 'awesome', 'great'].includes(lowerCaseQuery)) return { intent: 'ACKNOWLEDGEMENT' };

            return { intent: 'UNKNOWN' };
        };

        const parsed = parseQuery();

        switch (parsed.intent) {
            case 'GREETING': return { text: "Hello! How can I assist you with your analysis today?" };
            case 'ACKNOWLEDGEMENT': return { text: "You're welcome! Is there anything else I can help with?" };
            case 'INITIATE_ANALYSIS': {
                const context = { type: 'AWAITING_INDICATORS', ticker: parsed.ticker, period: '1M', prompt: 'Which indicators? (e.g., RSI, MACD)' };
                return { text: `Alright, analyzing **${parsed.ticker}**. Which indicators would you like to see? (e.g., RSI, MACD, or all)`, context };
            }
            case 'INITIATE_TRADE': {
                return { text: `Okay, ${parsed.details.quantity} share(s) of ${parsed.details.ticker}. At what price? You can say **market price** or a specific limit price (e.g., **at 161.50**).`, context: { type: 'CONFIRM_TRADE', details: parsed.details, prompt: `Price for ${parsed.details.ticker}? (e.g., market)` }};
            }
            case 'GET_PRICE': {
                const data = await apiCall('/portfolio-data', 'POST', { tickers: [parsed.ticker] });
                const priceInfo = data[parsed.ticker];
                if (priceInfo?.currentPrice) {
                    return { text: `The current price of **${parsed.ticker}** is **${getCurrency(parsed.ticker)}${priceInfo.currentPrice.toFixed(2)}**.` };
                }
                return { text: `Sorry, I couldn't fetch the live price for ${parsed.ticker}.` };
            }
            default: return { text: "I'm not sure how to answer that. You can say 'analyze reliance' or 'buy 10 shares of tcs'." };
        }
    }, [allTickers, fetchStockData, botContext, user, funds, portfolio, handleBuyFromBot, handleSellFromBot]);

    useEffect(() => {
        const isDark = localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        setDarkMode(isDark); document.documentElement.classList.toggle('dark', isDark);
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [tickers, rate] = await Promise.all([ apiCall('/get_all_tickers'), apiCall('/get-exchange-rate') ]);
                setAllTickers(tickers || []);
                setExchangeRate(rate?.usd_to_inr || 83.0);
            } catch (err) { setError("Could not connect to the server."); } finally { setLoading(false); }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (user && !user.isPracticeMode) {
            const savedPortfolio = localStorage.getItem(`portfolio_${user.username}`);
            const savedFunds = localStorage.getItem(`funds_${user.username}`);
            setPortfolio(savedPortfolio ? JSON.parse(savedPortfolio) : []);
            setFunds(savedFunds ? parseFloat(savedFunds) : 100000);
        } else if (user && user.isPracticeMode) {
            setPortfolio([]);
            setFunds(100000);
        } else { setPortfolio([]); setFunds(0); }
    }, [user]);

    useEffect(() => {
        if (user && user.username !== 'guest' && !user.isPracticeMode) {
            localStorage.setItem(`portfolio_${user.username}`, JSON.stringify(portfolio));
            localStorage.setItem(`funds_${user.username}`, funds.toString());
        }
    }, [portfolio, funds, user]);

    const toggleDarkMode = (mode) => { const isDark = typeof mode === 'boolean' ? mode : !darkMode; setDarkMode(isDark); localStorage.theme = isDark ? 'dark' : 'light'; document.documentElement.classList.toggle('dark', isDark); };

    useEffect(() => {
        const location = window.location.pathname;
        if (analyzedTicker && !['/indicators', '/bot'].includes(location)) {
            fetchStockData(analyzedTicker, timeFilter, true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeFilter]);

    const handleAnalyze = (tickerToAnalyze) => { 
        const finalTicker = tickerToAnalyze.trim().toUpperCase(); 
        if (finalTicker) { 
            setTickerInput(""); setTimeFilter("1D"); setChartType("line"); 
            fetchStockData(finalTicker, "1D", true, null); 
        } 
    };

    const value = { user, setUser, portfolio, setPortfolio, funds, setFunds, darkMode, toggleDarkMode, tickerInput, setTickerInput, analyzedTicker, timeFilter, setTimeFilter, chartType, setChartType, loading, isReloading, error, stockData, allTickers, showToast, toast, setToast, stockToSell, setStockToSell, handleAnalyze, logTransaction, exchangeRate, chatMessages, setChatMessages, getBotResponse, botContext, setBotContext, fetchStockData, indicatorPageConfig, configureIndicatorPage };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
AppContextProvider.propTypes = { children: PropTypes.node.isRequired };

const AppStructure = () => {
    const { user, setUser, toast, setToast, stockToSell, setStockToSell, darkMode, toggleDarkMode, setChatMessages, setBotContext } = useAppContext();
    const navigate = useNavigate();
    const handleLogout = () => {
        setUser(null);
        setChatMessages([]);
        setBotContext(null);
        navigate('/login');
    };
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {stockToSell && <SellModal stockToSell={stockToSell} setStockToSell={setStockToSell} />}
            {user && <TickerTape />}
            <div className={`container mx-auto px-2 sm:px-4 py-4 max-w-7xl ${user ? 'pt-16 sm:pt-20' : 'pt-8'}`}>
                {toast.show && <Toast message={toast.message} type={toast.type} onHide={() => setToast({ show: false, message: '', type: '' })} />}
                <header className="flex justify-between items-center mb-6">
                    {user && (user.username !== 'guest' || user.isPracticeMode) ? <Button variant="ghost" size="icon" onClick={() => navigate('/funds')}><Menu /></Button> : <div className="w-10" />}
                    <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center px-2">StockIQ</h1>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 p-1 rounded-full bg-gray-200 dark:bg-gray-800"><button onClick={() => toggleDarkMode(false)} className={`p-1.5 rounded-full ${!darkMode ? 'bg-white shadow' : ''}`}><Sun className="h-5 w-5 text-yellow-500" /></button><button onClick={() => toggleDarkMode(true)} className={`p-1.5 rounded-full ${darkMode ? 'bg-slate-900 shadow' : ''}`}><Moon className="h-5 w-5 text-slate-400" /></button></div>
                    </div>
                </header>
                {user && (
                    <nav className="mb-6">
                        <div className="flex flex-row flex-wrap gap-x-1 gap-y-2 justify-center items-center p-2 bg-white/60 dark:bg-gray-800/50 rounded-lg shadow-lg backdrop-blur-sm">
                            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><Home className="h-5 w-5" /><span>Home</span></NavLink>
                            <NavLink to="/chart" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><TrendingUp className="h-5 w-5" /><span>Chart</span></NavLink>
                            <NavLink to="/bot" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><Bot className="h-5 w-5" /><span>Assistant</span></NavLink>
                            <NavLink to="/portfolio" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><Briefcase className="h-5 w-5" /><span>Portfolio</span></NavLink>
                            <NavLink to="/indicators" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><Calculator className="h-5 w-5" /><span>Indicators</span></NavLink>
                            <NavLink to="/prediction" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><Brain className="h-5 w-5" /><span>Prediction</span></NavLink>
                            <NavLink to="/news" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><Newspaper className="h-5 w-5" /><span>News</span></NavLink>
                            <NavLink to="/backtest" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><ChevronsRight className="h-5 w-5" /><span>Backtest</span></NavLink>
                            <NavLink to="/track" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><Link2 className="h-5 w-5" /><span>Track</span></NavLink>
                            <NavLink to="/sip" className={({ isActive }) => `nav-link ${isActive && 'active'}`}><Calculator className="h-5 w-5" /><span>SIP</span></NavLink>
                            <Button onClick={handleLogout} variant="ghost" className="rounded-full sm:ml-auto"><LogOut className="mr-2 h-5 w-5" /><span>Logout</span></Button>
                        </div>
                    </nav>
                )}
                <main className="animate-fade-in">
                    <Routes>
                        <Route path="/login" element={<AuthPage />} />
                        <Route path="/funds" element={<ProtectedRoute practiceAllowed><FundsPage /></ProtectedRoute>} />
                        <Route path="/transactions" element={<ProtectedRoute practiceAllowed><TransactionsPage /></ProtectedRoute>} />
                        <Route path="/" element={<ProtectedRoute practiceAllowed><HomePage /></ProtectedRoute>} />
                        <Route path="/chart" element={<ProtectedRoute practiceAllowed><ChartPage /></ProtectedRoute>} />
                        <Route path="/indicators" element={<ProtectedRoute><IndicatorPage /></ProtectedRoute>} />
                        <Route path="/prediction" element={<ProtectedRoute><PredictionPage /></ProtectedRoute>} />
                        <Route path="/news" element={<ProtectedRoute practiceAllowed><NewsPage /></ProtectedRoute>} />
                        <Route path="/portfolio" element={<ProtectedRoute practiceAllowed><PortfolioPage /></ProtectedRoute>} />
                        <Route path="/track" element={<ProtectedRoute><ExternalPortfolioPage /></ProtectedRoute>} />
                        <Route path="/export" element={<ProtectedRoute><ExportPage /></ProtectedRoute>} />
                        <Route path="/backtest" element={<ProtectedRoute><BacktestingPage /></ProtectedRoute>} />
                        <Route path="/bot" element={<ProtectedRoute><TradingBotPage /></ProtectedRoute>} />
                        <Route path="/sip" element={<ProtectedRoute><SIPCalculatorPage /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to={useAppContext().user ? "/" : "/login"} />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};


const ProtectedRoute = ({ children, practiceAllowed = false }) => {
    const { user } = useAppContext();
    const location = useLocation();

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!practiceAllowed && user.isPracticeMode) {
        return <GuestPrompt />;
    }

    return children;
};

ProtectedRoute.propTypes = { children: PropTypes.node.isRequired, practiceAllowed: PropTypes.bool };

const App = () => (
    <Router>
        <AppContextProvider>
            <AppStructure />
        </AppContextProvider>
    </Router>
);

export default App;