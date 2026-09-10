import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ParadixeFooter } from '@/components/brand/ParadixeFooter';
import { ChatWidget } from '@/components/shared/ChatWidget';


export function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    // The dedicated Asistente IA page is already a full-screen chat; skip the
    // floating widget there to avoid showing two chat surfaces at once.
    const showChatWidget = location.pathname !== '/ai';

    return (
        <div className="flex h-screen w-full bg-slate-50">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-y-auto p-6 flex flex-col">
                    <div className="flex-1">
                        <Outlet />
                    </div>
                    <ParadixeFooter />
                </main>
            </div>
            {showChatWidget && <ChatWidget />}
        </div>

    );
}
