        import React, { useState, useEffect } from 'react';
        import { PlayCircle, Upload, Bell, FileText, MapPin } from 'lucide-react';

        function DashboardCard({ icon, title, value, change, changeLabel }) {
        const isPositive = change >= 0;
        
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {icon && <div className="mb-4">{icon}</div>}
            
            <p className="text-sm text-[#333333] mb-2">{title}</p>
            
            <h2 className="text-4xl font-bold text-[#333333] mb-3">{value}</h2>
            
            {change !== undefined && (
                <div className="flex items-center gap-1">
                <svg 
                    className={`w-4 h-4 ${isPositive ? 'text-green-600' : 'text-red-600'} ${!isPositive && 'rotate-180'}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                    />
                </svg>
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(change)}% {changeLabel || 'from last week'}
                </span>
                </div>
            )}
            </div>
        );
        }

        function ActionCard({ icon, title, onClick }) {
        return (
            <button 
            onClick={onClick}
            className='bg-white rounded-xl border-dashed border-2 border-[#CFCFCF] p-6 hover:border-green-600 hover:bg-gray-50 transition-all duration-200 cursor-pointer w-full text-left'
            >
            {icon && <div className="mb-4 text-green-600">{icon}</div>}
            <h2 className="text-lg font-semibold text-[#333333]">{title}</h2>
            </button>
        );
        }

        function WeatherIndicator() {
        const [weather, setWeather] = useState({
            temp: '28°C',
            condition: 'Sunny',
        });

        useEffect(() => {
            // FOR WEATHER API
        }, []);

        return (
            <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-100">
            <div className="flex flex-col">
                <span className="text-sm font-medium">{weather.temp}</span>
                <span className="text-xs text-[#333333]">{weather.condition}</span>
            </div>
            </div>
        );
        }

        export default function Dashboard() {
        const handleAction = (action) => {
            console.log(`Action clicked: ${action}`);
            // Add your action handlers here
        };

        return (
            <div className="m-0 p-0 min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10 m-0">
                <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-8 bg-green-600 rounded-full"></div>
                        <h1 className="text-2xl font-bold text-[#333333]">AgriVision</h1>
                    </div>
                    </div>

                    <WeatherIndicator />
                </div>
                </div>
            </header>

            <main className="px-6 py-8">
                <div className='mb-5'>
                <h1 className='text-2xl font-bold text-[#333333]'>
                    Dashboard
                </h1>
                <h2 className='text-2m text-[#9E9E9E]'>
                    Overview of your field monitoring system
                </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <DashboardCard 
                    title="Total Detections" 
                    value="128" 
                    change={12} 
                    changeLabel="from last week"
                />
                <DashboardCard 
                    title="Total Fields" 
                    value="12" 
                    change={5}
                    changeLabel="from last week"
                />
                <DashboardCard 
                    title="Active Alerts" 
                    value="3" 
                    change={-8}
                    changeLabel="from last week"
                />
                <DashboardCard 
                    title="Healthy Crops" 
                    value="89%" 
                    change={3}
                    changeLabel="from last week"
                />
                </div>
                
                <div className='mb-8'>
                <h1 className='text-2xl font-bold text-[#333333] mb-4'>
                    Quick Actions
                </h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <ActionCard
                    icon={<PlayCircle size={32} />}
                    title="Start Field Monitoring"
                    onClick={() => handleAction('start-monitoring')}
                    />
                    <ActionCard
                    icon={<Upload size={32} />}
                    title="Upload Image"
                    onClick={() => handleAction('upload-image')}
                    />
                    <ActionCard
                    icon={<Bell size={32} />}
                    title="View Alarm Logs"
                    onClick={() => handleAction('view-alarms')}
                    />
                    <ActionCard
                    icon={<FileText size={32} />}
                    title="Generate Report"
                    onClick={() => handleAction('generate-report')}
                    />
                    <ActionCard
                    icon={<MapPin size={32} />}
                    title="View Fields"
                    onClick={() => handleAction('view-fields')}
                    />
                </div>
                </div>
                <div>
                    <h1 className='text-2xl font-bold text-[#333333] mb-4'>
                        Recent Activities
                    </h1>
                    <div className='bg-white border border-[#CFCFCF] p-6 rounded-xl'>
                        <h2 className='text-[#D6D0D0] text-center'>
                            List is empty
                        </h2>
                    </div>
                </div>
            </main>
            </div>
        );
        }