import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  User as UserIcon, 
  CheckCheck, 
  Flag, 
  Ban, 
  ChevronLeft, 
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Conversation, ChatMessage } from '../types';
import { sendAppNotification } from '../services/notificationService';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    uid: string;
    displayName: string;
    photoURL?: string;
  } | null;
  onReportUser: (userId: string, userName: string) => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onReportUser,
}) => {
  const { currentUser, userProfile } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to construct consistent conversation ID between 2 users
  const getConversationId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load all user's conversations
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUser.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: Conversation[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Conversation);
      });
      // Sort in memory by lastMessageAt descending
      items.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
      setConversations(items);
    }, (error) => {
      console.warn('Conversations snapshot error:', error);
    });

    return () => unsub();
  }, [isOpen, currentUser]);

  // Setup active conversation if targetUser is provided
  useEffect(() => {
    if (!isOpen || !currentUser || !targetUser) return;
    if (targetUser.uid === currentUser.uid) return;

    const convId = getConversationId(currentUser.uid, targetUser.uid);
    const convRef = doc(db, 'conversations', convId);

    // Initialize conversation doc if not exists
    const initConv = async () => {
      try {
        const participantNames: Record<string, string> = {};
        participantNames[currentUser.uid] = userProfile?.displayName || currentUser.displayName || 'ຂ້ອຍ';
        participantNames[targetUser.uid] = targetUser.displayName || 'ຄູ່ສົນທະນາ';

        const participantPhotos: Record<string, string> = {};
        participantPhotos[currentUser.uid] = userProfile?.photoURL || currentUser.photoURL || '';
        participantPhotos[targetUser.uid] = targetUser.photoURL || '';

        const newConv: Conversation = {
          id: convId,
          participantIds: [currentUser.uid, targetUser.uid],
          participantNames,
          participantPhotos,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(convRef, newConv, { merge: true });
        setActiveConversation(newConv);
      } catch (err) {
        console.error('Failed to init conversation:', err);
      }
    };

    initConv();
  }, [isOpen, currentUser, targetUser, userProfile]);

  // Listen to messages for active conversation
  useEffect(() => {
    if (!isOpen || !activeConversation) {
      setMessages([]);
      return;
    }

    const messagesCol = collection(db, 'conversations', activeConversation.id, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach(d => {
        msgs.push({ id: d.id, ...d.data() } as ChatMessage);
      });
      setMessages(msgs);
    }, (error) => {
      console.warn('Messages listener error:', error);
    });

    return () => unsub();
  }, [isOpen, activeConversation]);

  if (!isOpen || !currentUser) return null;

  // Identify partner info in active conversation
  const partnerId = activeConversation?.participantIds.find(id => id !== currentUser.uid);
  const partnerName = partnerId ? activeConversation?.participantNames?.[partnerId] || 'ຄູ່ສົນທະນາ' : 'ຄູ່ສົນທະນາ';
  const partnerPhoto = partnerId ? activeConversation?.participantPhotos?.[partnerId] : undefined;

  const isPartnerBlocked = partnerId ? blockedUsers.includes(partnerId) : false;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeConversation || !partnerId || sending) return;

    if (isPartnerBlocked) {
      alert('ທ່ານໄດ້ບລັອກຜູ້ໃຊ້ນີ້ແລ້ວ ບໍ່ສາມາດສົ່ງຂໍ້ຄວາມໄດ້');
      return;
    }

    setSending(true);
    const textToSend = inputMessage.trim();
    setInputMessage('');

    try {
      const messagesCol = collection(db, 'conversations', activeConversation.id, 'messages');
      const now = new Date().toISOString();

      await addDoc(messagesCol, {
        conversationId: activeConversation.id,
        senderId: currentUser.uid,
        senderName: userProfile?.displayName || currentUser.displayName || 'ຂ້ອຍ',
        senderPhoto: userProfile?.photoURL || currentUser.photoURL || '',
        text: textToSend,
        read: false,
        createdAt: now,
      });

      // Update conversation lastMessage
      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        lastMessage: textToSend,
        lastSenderId: currentUser.uid,
        lastMessageAt: now,
        updatedAt: now,
      });

      // Send in-app notification to partner
      await sendAppNotification({
        recipientId: partnerId,
        senderId: currentUser.uid,
        senderName: userProfile?.displayName || currentUser.displayName || 'ເພື່ອນນັກເຕະບານ',
        title: 'ຂໍ້ຄວາມແຊັດໃໝ່',
        message: textToSend.length > 50 ? `${textToSend.slice(0, 50)}...` : textToSend,
        link: '/chat',
        type: 'chat_message',
      });

    } catch (err) {
      console.error('Failed to send message:', err);
      handleFirestoreError(err, OperationType.CREATE, `conversations/${activeConversation.id}/messages`);
    } finally {
      setSending(false);
    }
  };

  const handleToggleBlock = () => {
    if (!partnerId) return;
    if (isPartnerBlocked) {
      setBlockedUsers(prev => prev.filter(id => id !== partnerId));
    } else {
      if (confirm(`ທ່ານຕ້ອງການບລັອກ ${partnerName} ຫຼື ບໍ່? ທ່ານຈະບໍ່ໄດ້ຮັບຂໍ້ຄວາມຈາກຜູ້ໃຊ້ນີ້ອີກ.`)) {
        setBlockedUsers(prev => [...prev, partnerId]);
      }
    }
  };

  const formatChatTime = (isoString?: string) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl h-[650px] max-h-[92vh] bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center space-x-3">
            {activeConversation && (
              <button
                onClick={() => setActiveConversation(null)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 lg:hidden"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {activeConversation ? (
              <div className="flex items-center space-x-2.5">
                <img
                  src={partnerPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${partnerId}`}
                  alt={partnerName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/30"
                />
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>{partnerName}</span>
                    {isPartnerBlocked && (
                      <span className="text-[10px] px-1.5 py-0.2 bg-red-500/20 text-red-400 rounded">
                        ຖືກບລັອກ
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ພ້ອມສົນທະນາ
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-white">ຂໍ້ຄວາມແຊັດ (Chat)</h3>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {activeConversation && partnerId && (
              <>
                <button
                  onClick={handleToggleBlock}
                  title={isPartnerBlocked ? 'ປົດບລັອກ' : 'ບລັອກຜູ້ໃຊ້ນີ້'}
                  className={`p-2 rounded-xl text-xs transition flex items-center gap-1 ${
                    isPartnerBlocked
                      ? 'text-red-400 bg-red-950/40 hover:bg-red-900/40'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onReportUser(partnerId, partnerName)}
                  title="ລາຍງານຜູ້ໃຊ້"
                  className="p-2 text-neutral-400 hover:text-amber-400 rounded-xl hover:bg-neutral-800 transition"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Conversation List Sidebar (shown on desktop or when no active chat on mobile) */}
          <div className={`${
            activeConversation ? 'hidden lg:block w-72' : 'w-full'
          } border-r border-neutral-800 flex flex-col bg-neutral-950/40`}>
            
            <div className="p-3 border-b border-neutral-800/80">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                ລາຍການແຊັດ ({conversations.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/50">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  ຍັງບໍ່ມີປະຫວັດການແຊັດ. ກົດປຸ່ມ "ແຊັດ" ໃນໂພສຫາຄູ່ເພື່ອເລີ່ມສົນທະນາ!
                </div>
              ) : (
                conversations.map((conv) => {
                  const pId = conv.participantIds.find(id => id !== currentUser.uid);
                  const pName = pId ? conv.participantNames?.[pId] || 'ນັກເຕະ' : 'ນັກເຕະ';
                  const pPhoto = pId ? conv.participantPhotos?.[pId] : undefined;
                  const isSelected = activeConversation?.id === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConversation(conv)}
                      className={`p-3.5 flex items-center space-x-3 cursor-pointer transition ${
                        isSelected ? 'bg-neutral-800/90' : 'hover:bg-neutral-900/60'
                      }`}
                    >
                      <img
                        src={pPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${pId}`}
                        alt={pName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-neutral-700"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate">{pName}</h4>
                          <span className="text-[10px] text-neutral-500">
                            {formatChatTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {conv.lastMessage || 'ເລີ່ມສົນທະນາ...'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Active Chat Conversation Area */}
          <div className={`${
            !activeConversation ? 'hidden lg:flex flex-1 items-center justify-center' : 'flex-1 flex flex-col'
          } bg-neutral-900`}>
            
            {!activeConversation ? (
              <div className="text-center p-8 space-y-2 text-neutral-400">
                <MessageSquare className="w-12 h-12 mx-auto text-neutral-600" />
                <h4 className="text-sm font-semibold text-neutral-300">ເລືອກຫ້ອງແຊັດ</h4>
                <p className="text-xs text-neutral-500 max-w-xs">
                  ເລືອກລາຍການສົນທະນາຈາກດ້ານຊ້າຍ ຫຼື ກົດປຸ່ມແຊັດຈາກໜ້າໂພສນັດເຕະບານ
                </p>
              </div>
            ) : (
              <>
                {/* Message Stream */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-10 text-xs text-neutral-500">
                      ເລີ່ມຕົ້ນສົນທະນານັດໝາຍເຕະບານກັບ {partnerName} ໄດ້ເລີຍ!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.uid;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <img
                              src={msg.senderPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${msg.senderId}`}
                              alt={msg.senderName}
                              className="w-6 h-6 rounded-full object-cover shrink-0 mb-1"
                            />
                          )}

                          <div
                            className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                              isMe
                                ? 'bg-emerald-600 text-white rounded-br-none'
                                : 'bg-neutral-800 text-neutral-100 rounded-bl-none'
                            }`}
                          >
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <p className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                              isMe ? 'text-emerald-200' : 'text-neutral-400'
                            }`}>
                              <span>{formatChatTime(msg.createdAt)}</span>
                              {isMe && <CheckCheck className="w-3 h-3 inline" />}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-neutral-800 bg-neutral-950 flex items-center space-x-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={isPartnerBlocked ? 'ທ່ານໄດ້ບລັອກຜູ້ໃຊ້ນີ້ແລ້ວ' : 'ພິມຂໍ້ຄວາມ...'}
                    disabled={isPartnerBlocked}
                    className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none placeholder-neutral-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || sending || isPartnerBlocked}
                    className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 disabled:opacity-40 transition shadow-md shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};
