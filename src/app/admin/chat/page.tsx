"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Check, CheckCheck, UserCircle2, ArrowLeft, MessageCircle, Plus, Trash2, X } from 'lucide-react';
import Cookies from 'js-cookie';
import { io, Socket } from 'socket.io-client';
import Swal from 'sweetalert2';

type Contact = {
  id: number;
  username: string;
  role: string;
  namaLengkap: string;
  foto: string | null;
  unreadCount?: number;
};

type Message = {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  status: 'SENT' | 'DELIVERED' | 'READ';
  createdAt: string;
};

export default function ChatPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsers, setAllUsers] = useState<Contact[]>([]);
  const [newChatSearch, setNewChatSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const activeContactRef = useRef<Contact | null>(null);
  
  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Inisialisasi Current User
  useEffect(() => {
    let currentSocket: Socket | null = null;
    const rawToken = Cookies.get('token');
    
    if (rawToken) {
      try {
        const payload = JSON.parse(atob(rawToken.split('.')[1]));
        setCurrentUserId(payload.sub);
        
        currentSocket = io(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}`, {
          query: { userId: payload.sub }
        });
        
        initSocket(currentSocket);
        fetchContacts(payload.sub);
      } catch (e) {}
    }
    
    return () => {
      if (currentSocket) currentSocket.disconnect();
    };
  }, []);

  const initSocket = (newSocket: Socket) => {

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
    });

    newSocket.on('receiveMessage', (msg: Message) => {
      // Pindahkan pengirim ke paling atas dan tambah badge unread jika bukan kontak aktif
      setContacts(prevContacts => {
        const idx = prevContacts.findIndex(c => c.id === msg.senderId);
        if (idx === -1) return prevContacts;
        const newContacts = [...prevContacts];
        const [moved] = newContacts.splice(idx, 1);
        const updatedMoved = { ...moved };
        
        // Tambah badge unread jika pengirim bukan kontak yang sedang dibuka
        if (!activeContactRef.current || activeContactRef.current.id !== msg.senderId) {
           updatedMoved.unreadCount = (updatedMoved.unreadCount || 0) + 1;
        }
        
        return [updatedMoved, ...newContacts];
      });

      // Jika pesan dari kontak yang sedang aktif, langsung tambahkan ke list dan tandai READ
      if (activeContactRef.current && msg.senderId === activeContactRef.current.id) {
        setMessages(prev => {
          if (!prev.find(m => m.id === msg.id)) {
             return [...prev, msg];
          }
          return prev;
        });
        newSocket.emit('markAsRead', { messageIds: [msg.id], senderId: msg.senderId });
      }
    });

    newSocket.on('messageSent', (msg: Message) => {
      // Pindahkan penerima ke paling atas
      setContacts(prevContacts => {
        const idx = prevContacts.findIndex(c => c.id === msg.receiverId);
        if (idx === -1) return prevContacts;
        const newContacts = [...prevContacts];
        const [moved] = newContacts.splice(idx, 1);
        return [moved, ...newContacts];
      });

      // Saat pesan sukses tersimpan ke database
      setMessages(prev => {
        // Cek apakah pesan sudah ada (optimistic UI), jika belum tambahkan
        if (!prev.find(m => m.id === msg.id)) {
           return [...prev, msg];
        }
        return prev.map(m => m.id === msg.id ? msg : m);
      });
    });

    newSocket.on('messageStatusUpdate', (data: { messageId: number, status: string }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, status: data.status as any } : m));
    });

    newSocket.on('messagesRead', (data: { messageIds: number[] }) => {
      setMessages(prev => prev.map(m => data.messageIds.includes(m.id) ? { ...m, status: 'READ' } : m));
    });

    setSocket(newSocket);
  };

  const fetchContacts = async (userId: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/chat/contacts/${userId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Prepend local AI Assistant contact
        const aiContact: Contact = {
          id: 999999,
          username: 'ai_assistant',
          role: 'AI',
          namaLengkap: 'AI Asisten (Lokal)',
          foto: null,
          unreadCount: 0
        };

        setContacts([aiContact, ...data]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadChatHistory = async (contactId: number) => {
    if (!currentUserId) return;
    
    // Local storage routing for AI Assistant
    if (contactId === 999999) {
      const cached = localStorage.getItem('ai_chat_history');
      if (cached) {
        setMessages(JSON.parse(cached));
      } else {
        const welcomeMsg: Message = {
          id: Date.now(),
          senderId: 999999,
          receiverId: currentUserId,
          content: "Halo! Saya asisten AI PKL. Ada yang bisa saya bantu?",
          status: 'READ',
          createdAt: new Date().toISOString()
        };
        setMessages([welcomeMsg]);
        localStorage.setItem('ai_chat_history', JSON.stringify([welcomeMsg]));
      }
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/chat/history?user1=${currentUserId}&user2=${contactId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        
        // Cek jika ada pesan yang masuk dan belum di READ
        const unreadIds = data.filter((m: Message) => m.receiverId === currentUserId && m.status !== 'READ').map((m: Message) => m.id);
        if (unreadIds.length > 0 && socket) {
          socket.emit('markAsRead', { messageIds: unreadIds, senderId: contactId });
          setMessages(prev => prev.map(m => unreadIds.includes(m.id) ? { ...m, status: 'READ' } : m));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectContact = (contact: Contact) => {
    setActiveContact(contact);
    loadChatHistory(contact.id);
    
    // Hapus badge unread untuk kontak ini
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unreadCount: 0 } : c));
  };

  const handleOpenNewChat = async () => {
    setShowNewChatModal(true);
    if (allUsers.length === 0) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/chat/all-users/${currentUserId}`);
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteChat = async () => {
    if (!activeContact) return;
    
    Swal.fire({
      title: 'Hapus Obrolan?',
      text: `Apakah Anda yakin ingin menghapus obrolan dengan ${activeContact.namaLengkap}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        if (activeContact.id === 999999) {
          localStorage.removeItem('ai_chat_history');
          setMessages([]);
          setActiveContact(null);
          Swal.fire('Terhapus!', 'Obrolan AI telah dihapus.', 'success');
          return;
        }

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/chat/history?user1=${currentUserId}&user2=${activeContact.id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setMessages([]);
            setActiveContact(null);
            setContacts(prev => prev.filter(c => c.id !== activeContact.id));
            Swal.fire('Terhapus!', 'Obrolan telah dihapus.', 'success');
          }
        } catch (e) {
          console.error(e);
          Swal.fire('Error', 'Gagal menghapus obrolan.', 'error');
        }
      }
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    if (activeContact.id === 999999) {
      const userMsgContent = newMessage.trim();
      setNewMessage('');

      const userMsg: Message = {
        id: Date.now(),
        senderId: currentUserId,
        receiverId: 999999,
        content: userMsgContent,
        status: 'READ',
        createdAt: new Date().toISOString()
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      localStorage.setItem('ai_chat_history', JSON.stringify(updatedMessages));

      // Append typing indicator placeholder
      const typingMsgId = Date.now() + 1;
      const typingMsg: Message = {
        id: typingMsgId,
        senderId: 999999,
        receiverId: currentUserId,
        content: "...",
        status: 'READ',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, typingMsg]);

      // Fetch AI response
      const historyForAI = updatedMessages.map(m => ({
        role: m.senderId === currentUserId ? 'user' : 'assistant',
        content: m.content
      })).slice(-6);

      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForAI })
      })
      .then(res => res.json())
      .then(data => {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== typingMsgId);
          const replyMsg: Message = {
            id: Date.now() + 2,
            senderId: 999999,
            receiverId: currentUserId,
            content: data.success ? data.reply : data.message,
            status: 'READ',
            createdAt: new Date().toISOString()
          };
          const finalMessages = [...filtered, replyMsg];
          localStorage.setItem('ai_chat_history', JSON.stringify(finalMessages));
          return finalMessages;
        });
      })
      .catch(err => {
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== typingMsgId);
          const errorMsg: Message = {
            id: Date.now() + 2,
            senderId: 999999,
            receiverId: currentUserId,
            content: "Gagal terhubung ke AI lokal. Pastikan server backend Anda berjalan.",
            status: 'READ',
            createdAt: new Date().toISOString()
          };
          const finalMessages = [...filtered, errorMsg];
          localStorage.setItem('ai_chat_history', JSON.stringify(finalMessages));
          return finalMessages;
        });
      });
      return;
    }

    if (!socket) return;
    socket.emit('sendMessage', {
      senderId: currentUserId,
      receiverId: activeContact.id,
      content: newMessage.trim()
    });

    setNewMessage('');
  };

  // Format Jam
  const formatTime = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredContacts = contacts.filter(c => 
    c.namaLengkap.toLowerCase().includes(search.toLowerCase()) || 
    c.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[500px] flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* KIRI - Daftar Kontak */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 ${activeContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">Pesan</h2>
            <button 
              onClick={handleOpenNewChat}
              className="p-2 bg-smk-blue text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
              title="Pesan Baru"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari kontak..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map(c => (
            <div 
              key={c.id} 
              onClick={() => handleSelectContact(c)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-slate-50 ${activeContact?.id === c.id ? 'bg-smk-blue/5' : 'hover:bg-slate-50'}`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                {c.id === 999999 ? (
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=ai_assistant&backgroundColor=e0f2fe" alt="AI Avatar" className="w-full h-full object-cover" />
                ) : c.foto ? (
                  <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${c.foto}`} alt={c.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${c.username}&backgroundColor=f8fafc`} alt="Avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="font-bold text-slate-800 text-sm truncate">{c.namaLengkap}</h3>
                  {c.unreadCount && c.unreadCount > 0 ? (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 capitalize">{c.role === 'AI' ? 'AI Assistant' : c.role.toLowerCase()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KANAN - Ruang Obrolan */}
      <div className={`flex-1 flex flex-col bg-[#efeae2] relative ${!activeContact ? 'hidden md:flex' : 'flex'}`}>
        {/* Chat Pattern Background (WhatsApp style) */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-light_04fcacde539c58cca6745483d4858c52.png")', backgroundRepeat: 'repeat' }}></div>
        
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center z-10">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-slate-300 shadow-sm mb-4">
              <MessageCircle size={48} />
            </div>
            <h3 className="text-xl font-bold text-slate-700">Aplikasi Pesan PKL</h3>
            <p className="text-sm text-slate-500 mt-2">Pilih kontak untuk mulai berkirim pesan.</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 gap-3 z-10 shrink-0">
              <button 
                onClick={() => setActiveContact(null)}
                className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                {activeContact.id === 999999 ? (
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=ai_assistant&backgroundColor=e0f2fe" alt="AI Avatar" className="w-full h-full object-cover" />
                ) : activeContact.foto ? (
                  <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${activeContact.foto}`} alt={activeContact.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${activeContact.username}&backgroundColor=f8fafc`} alt="Avatar" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-slate-800 leading-tight">{activeContact.namaLengkap}</h2>
                <p className="text-xs text-slate-500 capitalize">{activeContact.role === 'AI' ? 'AI Assistant' : activeContact.role.toLowerCase()}</p>
              </div>
              <button 
                onClick={handleDeleteChat}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                title="Hapus Obrolan"
              >
                <Trash2 size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 z-10 space-y-2">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === currentUserId;
                
                // Render Tick icon based on status
                const renderTick = () => {
                  if (!isMe) return null;
                  if (msg.status === 'SENT') return <Check size={14} className="text-slate-400" />;
                  if (msg.status === 'DELIVERED') return <CheckCheck size={14} className="text-slate-400" />;
                  if (msg.status === 'READ') return <CheckCheck size={14} className="text-blue-500" />;
                  return null;
                };

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[75%] sm:max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm relative ${
                        isMe ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'
                      }`}
                    >
                      <div className="text-[14px] leading-relaxed break-words pb-3">
                        {msg.content === '...' && msg.senderId === 999999 ? (
                          <div className="flex gap-1 items-center py-2 px-1">
                            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2.5 h-2.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      <div className="absolute right-2 bottom-1 flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">{formatTime(msg.createdAt)}</span>
                        {renderTick()}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-slate-50 p-3 flex items-end gap-2 z-10 shrink-0">
              <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-smk-blue"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-smk-blue text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  <Send size={20} className="ml-1" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {showNewChatModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">Pesan Baru</h2>
              <button onClick={() => setShowNewChatModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Cari pengguna..."
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-smk-blue"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {allUsers.filter(u => u.namaLengkap.toLowerCase().includes(newChatSearch.toLowerCase())).map(u => (
                <div 
                  key={u.id}
                  onClick={() => {
                    if (!contacts.find(c => c.id === u.id)) {
                      setContacts([u, ...contacts]);
                    }
                    handleSelectContact(u);
                    setShowNewChatModal(false);
                  }}
                  className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {u.foto ? (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${u.foto}`} alt={u.namaLengkap} className="w-full h-full object-cover" />
                    ) : (
                      <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${u.username}&backgroundColor=f8fafc`} alt="Avatar" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{u.namaLengkap}</h3>
                    <p className="text-xs text-slate-500 capitalize">{u.role.toLowerCase()}</p>
                  </div>
                </div>
              ))}
              {allUsers.filter(u => u.namaLengkap.toLowerCase().includes(newChatSearch.toLowerCase())).length === 0 && (
                <div className="text-center p-4 text-slate-500 text-sm">Tidak ada pengguna ditemukan.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
