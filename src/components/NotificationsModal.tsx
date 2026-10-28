import React from 'react';
import { 
  X, 
  Bell, 
  Swords, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  Calendar, 
  CheckCheck 
} from 'lucide-react';
import { AppNotification } from '../types';
import { markNotificationAsRead } from '../services/notificationService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNavigateTo: (link?: string, type?: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigateTo,
}) => {
  if (!isOpen) return null;

  const handleItemClick = async (notif: AppNotification) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
    }
    onNavigateTo(notif.link, notif.type);
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'request_received':
        return <Swords className="w-4 h-4 text-amber-400" />;
      case 'request_accepted':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'request_rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'chat_message':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      default:
        return <Calendar className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">ການແຈ້ງເຕືອນ (Notifications)</h3>
              <p className="text-xs text-neutral-400">
                {notifications.filter(n => !n.read).length} ລາຍການທີ່ຍັງບໍ່ໄດ້ອ່ານ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification items */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 divide-y divide-neutral-800/40">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-neutral-700" />
              <p>ຍັງບໍ່ມີການແຈ້ງເຕືອນໃໝ່</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`pt-2.5 p-3 rounded-2xl cursor-pointer transition flex items-start space-x-3 ${
                  !notif.read ? 'bg-neutral-800/80 border border-neutral-700/60' : 'hover:bg-neutral-950/60'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white truncate">{notif.title}</h4>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                  <span className="text-[10px] text-neutral-500 mt-1 block">
                    {new Date(notif.createdAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-center">
          <button
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white"
          >
            ປິດໜ້າຕ່າງ
          </button>
        </div>

      </div>
    </div>
  );
};
