import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from 'react';
import { message as antMessage } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { AdminPage } from '@/features/admin/AdminPage';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';
import { LoadingState } from '@/components/LoadingState';
import { DepartmentsPage } from '@/features/departments/DepartmentsPage';
import { SubmitPhotosModal } from '@/features/gallery/components/SubmitPhotosModal';
import { useGalleryAccess } from '@/features/gallery/hooks/useGalleryAccess';
import { chatImagesOf } from '@/features/gallery/utils/chatImages';
import { HrPage } from '@/features/hr/HrPage';
import { AppMenuContext } from '@/lib/appMenu';
import { canAccessWorkspace } from '@/lib/workspaces';
import { ProfileDrawer } from '@/features/profile/ProfileDrawer';
import { SendCardModal } from '@/features/profile/SendCardModal';
import { UserProfileModal } from '@/features/profile/UserProfileModal';
import type { CallMode, ChatMessage, Room, Task, TaskPreset, User } from '@/types';
import { CallOverlay } from './components/CallOverlay';
import { ChatHeader } from './components/ChatHeader';
import { ChatSidebar } from './components/ChatSidebar';
import { Composer } from './components/Composer';
import { ContactPickerModal } from './components/ContactPickerModal';
import { ConversationSearch } from './components/ConversationSearch';
import { ForwardModal } from './components/ForwardModal';
import { GalleryModal } from './components/GalleryModal';
import { GroupDrawer } from './components/GroupDrawer';
import { IncomingCallModal } from './components/IncomingCallModal';
import { JoinGroupModal } from './components/JoinGroupModal';
import { MessageList } from './components/MessageList';
import { AppMenuDrawer } from './components/AppMenuDrawer';
import { NewChatModal } from './components/NewChatModal';
import { NoteModal } from './components/NoteModal';
import { PinBar } from './components/PinBar';
import { SelectionBar } from './components/SelectionBar';
import { PollCreateModal } from './components/PollCreateModal';
import { ReminderModal } from './components/ReminderModal';
import { TaskModal } from './components/TaskModal';
import { TypingIndicator } from './components/TypingIndicator';
import { parseJoinHash } from './utils/invite';
import { canEditItem } from './utils/rooms';
import { useChatNotifications } from './hooks/useChatNotifications';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useChatRoom } from './hooks/useChatRoom';
import { useBlockUser } from './hooks/useBlockUser';
import { useChatCall } from './hooks/useChatCall';
import { useChatSocket } from './hooks/useChatSocket';
import { useComposer } from './hooks/useComposer';
import { useMessageActions } from './hooks/useMessageActions';
import { useMessageSelection } from './hooks/useMessageSelection';
import { useOpenTask } from './hooks/useOpenTask';
import { useReactMessage } from './hooks/useReactMessage';
import { useRoomList } from './hooks/useRoomList';
import { useSendMessage } from './hooks/useSendMessage';
import { isTemp } from './utils/messageCache';
import { useRoomPrefs } from './hooks/useRoomPrefs';
import { LastSeenContext, useLastSeen } from './hooks/useLastSeen';
import { useRoomTools } from './hooks/useRoomTools';
import { TaskDueToasts } from '@/features/work/components/TaskDueToasts';
import { useWorkspace, type Workspace } from './hooks/useWorkspace';
import { DropOverlay } from './components/DropOverlay';
import { useFileDrop } from './hooks/useFileDrop';
import { canForward } from './utils/forward';
import { isSelectable } from './utils/selection';
import { photosFromMessages, splitDropped } from './utils/media';
import { handleFromEmail, mentionsAllowed } from './utils/mentions';
import {
  countOnlineMembers,
  hasOnlineMember,
  hiddenPresenceKey,
  hidePresence,
  isOtherRoomOnline,
  isOtherUserOnline,
  peerUserIdOf,
  type Presence,
} from './utils/presence';
import { countAlertingRooms, countUnreadRooms, isDirectRoom } from './utils/rooms';

type Props = {
  user: User;
  onLogout: () => void;
  onUserUpdate: (payload: { user: User }) => void;
};

type MenuMode = 'closed' | 'click' | 'hover';

function clearTimer(ref: { current: number | null }) {
  if (ref.current !== null) {
    window.clearTimeout(ref.current);
    ref.current = null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withLazy<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  const Lazy = lazy(load);
  return function LazyWorkspace(props: ComponentProps<T>) {
    return (
      <Suspense fallback={<LoadingState />}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

const ContactsPage = withLazy(() =>
  import('@/features/contacts/ContactsPage').then((m) => ({ default: m.ContactsPage })),
);
const DocsPage = withLazy(() =>
  import('@/features/docs/DocsPage').then((m) => ({ default: m.DocsPage })),
);
const EmailPage = withLazy(() =>
  import('@/features/email/EmailPage').then((m) => ({ default: m.EmailPage })),
);
const GalleryPage = withLazy(() =>
  import('@/features/gallery/GalleryPage').then((m) => ({ default: m.GalleryPage })),
);
const MeetingsPage = withLazy(() =>
  import('@/features/meetings/MeetingsPage').then((m) => ({ default: m.MeetingsPage })),
);
const NewsPage = withLazy(() =>
  import('@/features/news/NewsPage').then((m) => ({ default: m.NewsPage })),
);
const TasksPage = withLazy(() =>
  import('@/features/tasks/TasksPage').then((m) => ({ default: m.TasksPage })),
);

export function ChatPage({ user, onLogout, onUserUpdate }: Props) {
  const narrow = useMediaQuery('(max-width: 1100px)');
  const [infoHidden, setInfoHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chatvcb.infoHidden') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (infoHidden) {
        localStorage.setItem('chatvcb.infoHidden', '1');
      } else {
        localStorage.removeItem('chatvcb.infoHidden');
      }
    } catch {}
  }, [infoHidden]);
  const [error, setError] = useState('');
  // Ngăn menu: 'click' = mở bằng nút ☰ (có mask); 'hover' = chuột chạm mép trái (không mask, rời chuột thì đóng).
  const [menuMode, setMenuModeState] = useState<MenuMode>('closed');
  const menuModeRef = useRef<MenuMode>('closed');
  const menuOpenTimerRef = useRef<number | null>(null);
  const menuCloseTimerRef = useRef<number | null>(null);

  const setMenuMode = useCallback((mode: MenuMode) => {
    clearTimer(menuOpenTimerRef);
    clearTimer(menuCloseTimerRef);
    menuModeRef.current = mode;
    setMenuModeState(mode);
  }, []);

  useEffect(
    () => () => {
      clearTimer(menuOpenTimerRef);
      clearTimer(menuCloseTimerRef);
    },
    [],
  );

  const openMenu = useCallback(() => setMenuMode('click'), [setMenuMode]);
  const closeMenu = useCallback(() => setMenuMode('closed'), [setMenuMode]);

  // Chuột ở mép trái 150 ms thì mở; rời ngăn 250 ms thì đóng (quay lại kịp thì huỷ).
  const hoverEnterMenu = useCallback(() => {
    clearTimer(menuCloseTimerRef);
    if (menuModeRef.current === 'closed' && menuOpenTimerRef.current === null) {
      menuOpenTimerRef.current = window.setTimeout(() => setMenuMode('hover'), 150);
    }
  }, [setMenuMode]);

  const hoverLeaveMenu = useCallback(() => {
    clearTimer(menuOpenTimerRef);
    if (menuModeRef.current === 'hover' && menuCloseTimerRef.current === null) {
      menuCloseTimerRef.current = window.setTimeout(() => setMenuMode('closed'), 250);
    }
  }, [setMenuMode]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupOverlay, setGroupOverlay] = useState(false);
  const [rightPane, setRightPane] = useState<'info' | 'search'>('info');
  const [forwarding, setForwarding] = useState<ChatMessage[]>([]);
  const [sharingImages, setSharingImages] = useState<{ id: string; url: string }[]>([]);
  /** Đang mở hộp "Cuộc trò chuyện mới" ở tab nào; null là đóng. */
  const [newChat, setNewChat] = useState<'direct' | 'group' | null>(null);
  const [assigning, setAssigning] = useState<TaskPreset | null>(null);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  // Đang gửi danh thiếp của người này (mở từ popup hồ sơ)
  const [cardUser, setCardUser] = useState<{ id: string; name: string } | null>(null);
  const [searchText, setSearchText] = useState('');
  const [joinToken, setJoinToken] = useState<string | null>(() => parseJoinHash(window.location.hash));
  const myHandle = handleFromEmail(user.email);

  useEffect(() => {
    const onHashChange = () => {
      setJoinToken(parseJoinHash(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const { workspace, setWorkspace, isViewingChat, isViewingNews, confirmLeave, setLeaveBlocked } =
    useWorkspace();
  const accessLoaded = Array.isArray(user.permissions);

  useEffect(() => {
    if (!accessLoaded) {
      return;
    }
    if (!canAccessWorkspace(user, workspace)) {
      setWorkspace('messenger');
    }
  }, [accessLoaded, workspace, user, setWorkspace]);
  const { canReview: canReviewGallery } = useGalleryAccess();
  const { data: galleryReview } = useQuery({
    queryKey: queryKeys.galleryReviewCount,
    queryFn: () => api.galleryReviewCount(),
    enabled: canReviewGallery,
  });
  const { data: newsUnread } = useQuery({
    queryKey: queryKeys.newsUnread,
    queryFn: () => api.newsUnread(),
  });
  const roomList = useRoomList({ isViewingChat, setError });
  const { rooms, room, roomId } = roomList;

  const messengerUnread = useMemo(() => countUnreadRooms(rooms), [rooms]);
  const menuBadges = useMemo<Partial<Record<Workspace, number>>>(
    () => ({
      messenger: messengerUnread,
      ...(canReviewGallery ? { gallery: galleryReview?.pending ?? 0 } : {}),
      news: newsUnread?.count ?? 0,
    }),
    [messengerUnread, canReviewGallery, galleryReview?.pending, newsUnread?.count],
  );
  const hasBadge = useMemo(
    () =>
      (Object.entries(menuBadges) as [Workspace, number | undefined][]).some(
        ([ws, count]) => ws !== workspace && (count ?? 0) > 0,
      ),
    [menuBadges, workspace],
  );
  const menuCtx = useMemo(
    () => ({ open: openMenu, hasBadge }),
    [openMenu, hasBadge],
  );
  const { setBlocked, askBlock } = useBlockUser({ setRooms: roomList.setRooms });
  const roomPrefs = useRoomPrefs({
    setRooms: roomList.setRooms,
    removeRoom: roomList.removeRoom,
    askBlock,
  });
  const tools = useRoomTools({ roomId, setWorkspace, openRoom: roomList.openRoom });

  const openRoomFromNotice = (id: string) => {
    setWorkspace('messenger');
    const target = rooms.find((r) => r.id === id);
    if (target) {
      roomList.selectRoom(target);
    } else {
      void antMessage.info('Cuộc trò chuyện không còn trong danh sách.');
    }
  };

  // Mở cuộc trò chuyện từ Danh bạ hoặc hồ sơ thì chuyển hẳn về Messenger
  const openRoomFromContacts = (target: Room) => {
    setWorkspace('messenger');
    void roomList.openRoom(target);
  };

  const toggleInfo = useCallback(() => {
    if (narrow) {
      setRightPane('info');
      setGroupOverlay((current) => !current);
    } else {
      setRightPane('info');
      setInfoHidden((current) => !current);
    }
  }, [narrow]);

  const tabUnread = useMemo(() => countAlertingRooms(rooms), [rooms]);
  useChatNotifications({ onOpenRoom: openRoomFromNotice, unread: tabUnread });

  // Toast việc sắp hết hạn: mở tin việc trong Messenger từ bất kỳ màn nào.
  const openTaskFromToast = (task: Task) => {
    setWorkspace('messenger');
    if (task.messageId) {
      chat.openMessage(task.roomId, task.messageId);
    } else {
      openRoomFromNotice(task.roomId);
    }
  };
  // Tab "Tệp từ chat" của Docs: về Messenger và cuộn tới tin chứa tệp
  const openMessageFromDocs = (targetRoomId: string, messageId: string, createdAt: string) => {
    setWorkspace('messenger');
    chat.openMessage(targetRoomId, messageId, createdAt);
  };
  const chat = useChatRoom({
    user,
    roomId,
    roomIdRef: roomList.roomIdRef,
    unreadOnOpenRef: roomList.unreadOnOpenRef,
    workspace,
    setRoomId: roomList.setRoomId,
    setRooms: roomList.setRooms,
    isViewingChat,
    setError,
  });
  const sender = useSendMessage({
    user,
    roomId,
    setRooms: roomList.setRooms,
    markMessageRead: chat.markMessageRead,
  });
  const react = useReactMessage(user);
  const composer = useComposer({
    roomId,
    messages: chat.messages,
    send: sender.send,
    setMessages: chat.setMessages,
    setError,
  });
  const drop = useFileDrop({
    disabled: !roomId || Boolean(composer.editing),
    onFiles: (files) => {
      const { images, docs } = splitDropped(files);
      if (images.length) composer.addImages(images);
      if (docs.length) composer.addDocs(docs);
    },
  });
  const selection = useMessageSelection(roomId);
  const { handleMessageAction, handleReact, handleDeleteMany } = useMessageActions({
    roomId,
    setMessages: chat.setMessages,
    setPins: chat.setPins,
    onReply: composer.setReplyTo,
    onForward: (message) => setForwarding([message]),
    onShareToLibrary: (message) => setSharingImages(chatImagesOf(message)),
    onEdit: composer.startEdit,
    onSelect: selection.start,
    onSavedToCloud: chat.handleForwarded,
    react,
    onRetrySend: sender.retry,
    onDiscardSend: sender.discard,
  });
  const {
    onlineUsers: rawOnlineUsers,
    onlineUserIds: rawOnlineUserIds,
    typing,
    emitTyping,
    emitCall,
    setCallHandler,
  } = useChatSocket({
    user,
    myHandle,
    roomId,
    roomIdRef: roomList.roomIdRef,
    rooms,
    refreshRooms: roomList.refreshRooms,
    removeRoom: roomList.removeRoom,
    openRoom: openRoomFromNotice,
    isViewingChat,
    isViewingNews,
    markMessageRead: chat.markMessageRead,
    setMessages: chat.setMessages,
    setPending: chat.setPending,
    setRooms: roomList.setRooms,
    setOnline: chat.setOnline,
    setReads: chat.setReads,
    setPins: chat.setPins,
  });
  const call = useChatCall({
    user,
    rooms,
    openRoom: openRoomFromNotice,
    emitCall,
    setCallHandler,
  });
  const { lastSeen: rawLastSeen, now } = useLastSeen();
  // Chặn một chiều nào thì hai bên không thấy trạng thái hoạt động của nhau (như Messenger)
  const hiddenKey = hiddenPresenceKey(rooms);
  const { onlineUserIds, onlineUsers, roomOnline, lastSeen } = useMemo(
    () =>
      hidePresence(new Set(hiddenKey ? hiddenKey.split(',') : []), {
        onlineUserIds: rawOnlineUserIds,
        onlineUsers: rawOnlineUsers,
        roomOnline: chat.online,
        lastSeen: rawLastSeen,
      }),
    [hiddenKey, rawOnlineUserIds, rawOnlineUsers, chat.online, rawLastSeen],
  );
  const onAssigned = (created: ChatMessage) => {
    if (created.roomId === roomId) {
      chat.appendMessage(created);
    }
  };

  const openTask = useOpenTask({
    roomId,
    workspace,
    messagesLoaded: chat.messagesLoaded,
    setWorkspace,
    findRoom: roomList.findRoom,
    openRoom: roomList.openRoom,
    jumpToMessage: chat.jumpToMessage,
  });

  useEffect(() => {
    setGroupOverlay(false);
    setRightPane('info');
    // Việc giao theo phòng đang mở: để modal mở qua phòng khác là tạo nhầm phòng
    tools.setToolModal((current) => (current === 'task' ? null : current));
  }, [roomId]);

  const isDirect = Boolean(room && isDirectRoom(room));
  const locked = Boolean(room?.settings?.adminOnlySend && room.myRole === 'member');
  const canPin = !(room?.settings?.adminOnlyPin && room.myRole === 'member');
  const presence: Presence = { myId: user.id, online: roomOnline, onlineUserIds };
  const peerUserId = peerUserIdOf(room, chat.members, user.id);
  const isPeerOnline = isOtherUserOnline(presence, peerUserId);
  const peerLastSeenAt = peerUserId ? lastSeen[peerUserId] : undefined;
  const isGroupOnline = hasOnlineMember(presence, chat.members);
  const lastSeenCtx = useMemo(() => ({ lastSeen, now, onlineUserIds }), [lastSeen, now, onlineUserIds]);
  const onlineMembersCount = countOnlineMembers(presence, chat.members);
  // Ảnh blob của tin tạm sẽ bị giải phóng, không đưa vào kho ảnh của phòng
  const chatPhotos = useMemo(
    () => photosFromMessages(chat.messages.filter((m) => !isTemp(m))),
    [chat.messages],
  );
  const markRead = () => chat.markMessageRead();
  // Tin bị thu hồi trong lúc đang chọn tự rơi khỏi danh sách
  const selectedMessages = useMemo(
    () => chat.messages.filter((m) => selection.selectedIds.has(m.id) && isSelectable(m)),
    [chat.messages, selection.selectedIds],
  );

  function isRoomOnline(item: Room) {
    if (item.id !== roomId) {
      return isOtherRoomOnline(presence, item);
    }
    return isDirect ? isPeerOnline : isGroupOnline;
  }

  // Chat 1-1 với người đang xem hồ sơ (nếu đã có trên danh sách): cờ chặn ở đây luôn mới nhất
  const profileRoom = viewProfileId ? rooms.find((item) => item.peerUserId === viewProfileId) : undefined;
  const profileBlocks = profileRoom
    ? { byMe: Boolean(profileRoom.blockedByMe), me: Boolean(profileRoom.blockedMe) }
    : undefined;

  /** "Gọi thoại / Gọi video" ở popup hồ sơ: mở chat 1-1 với người đó rồi bắt đầu đổ chuông. */
  function startCallWith(target: Room, mode: CallMode = 'video') {
    openRoomFromContacts(target);
    void call.startCall(target, mode);
  }

  return (
    <AppMenuContext.Provider value={menuCtx}>
      <div
        className="menu-edge"
        aria-hidden="true"
        onPointerEnter={(e) => {
          if (e.pointerType === 'mouse') {
            hoverEnterMenu();
          }
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse') {
            hoverLeaveMenu();
          }
        }}
      />
      <LastSeenContext.Provider value={lastSeenCtx}>
        <div
          className={`app-shell module-${workspace}${
            !narrow && infoHidden ? ' info-hidden' : ''
          }`}
        >
        <AppMenuDrawer
          open={menuMode !== 'closed'}
          hoverMode={menuMode === 'hover'}
          onClose={closeMenu}
          onHoverEnter={hoverEnterMenu}
          onHoverLeave={hoverLeaveMenu}
          workspace={workspace}
          user={user}
          badges={menuBadges}
          onSelect={(next) => {
            setWorkspace(next);
            setGroupOverlay(false);
          }}
          onOpenProfile={() => setProfileOpen(true)}
          onLogout={() => confirmLeave(onLogout)}
        />

      {workspace === 'messenger' ? (
        <ChatSidebar
          user={user}
          rooms={rooms}
          roomId={roomId}
          roomsMeta={roomList.roomsMeta}
          loadingOlderRooms={roomList.loadingOlderRooms}
          loadingRooms={roomList.loadingRooms}
          searchText={searchText}
          onlineUsers={onlineUsers}
          isRoomOnline={isRoomOnline}
          onSearchTextChange={setSearchText}
          onSelectRoom={roomList.selectRoom}
          onOpenRoom={roomList.openRoom}
          onOpenMessage={chat.openMessage}
          onLoadMoreRooms={roomList.loadMoreRooms}
          onNewChat={() => setNewChat('direct')}
          onOpenCloud={tools.openCloud}
          lastSeen={lastSeen}
          now={now}
          prefs={roomPrefs}
          drafts={composer.drafts}
        />
      ) : null}

      {workspace === 'messenger' ? (
        <main className={selection.selecting ? 'chat selecting' : 'chat'} {...drop.dropProps}>
          <ChatHeader
            room={room}
            isDirect={isDirect}
            isPeerOnline={isPeerOnline}
            lastSeenAt={peerLastSeenAt}
            now={now}
            membersCount={chat.members.length}
            onlineMembersCount={onlineMembersCount}
            infoOpen={narrow ? groupOverlay : !infoHidden}
            onToggleInfo={toggleInfo}
            onSearch={() => {
              setRightPane('search');
              if (narrow) {
                setGroupOverlay(true);
              } else {
                setInfoHidden(false);
              }
            }}
            onStartAudioCall={
              room && !room.isCloud && !locked && !room.blockedByMe && !room.blockedMe
                ? () => void call.startCall(room, 'audio')
                : undefined
            }
            onStartVideoCall={
              room && !room.isCloud && !locked && !room.blockedByMe && !room.blockedMe
                ? () => void call.startCall(room, 'video')
                : undefined
            }
            onOpenProfile={
              room?.peerUserId ? () => setViewProfileId(room.peerUserId) : undefined
            }
          />
          <PinBar pins={chat.pins} onJump={chat.jumpToMessage} />
          <MessageList
            listRef={chat.listRef}
            messages={chat.messages}
            unreadFromId={chat.unreadFromId}
            reads={chat.reads}
            members={chat.members}
            loading={Boolean(roomId) && !chat.messagesLoaded}
            readReceipts={Boolean(room) && !isDirect && !room?.isCloud}
            showAuthorNames={Boolean(room) && !isDirect && !room?.isCloud}
            userId={user.id}
            myHandle={myHandle}
            loadingOlder={chat.loadingOlder}
            pending={chat.pending}
            canSaveToCloud={!room?.isCloud}
            canPin={canPin}
            canManage={room?.canManage ?? false}
            mentionsEnabled={mentionsAllowed(room)}
            showDelivery={!room?.isCloud && isDirect}
            selecting={selection.selecting}
            selectedIds={selection.selectedIds}
            onToggleSelect={selection.toggle}
            onLoadOlder={chat.loadOlder}
            onMarkRead={markRead}
            onViewProfile={setViewProfileId}
            onOpenRoom={roomList.openRoom}
            onAction={handleMessageAction}
            onReact={handleReact}
            onJump={chat.jumpToMessage}
            onMessageUpdated={(next) =>
              chat.setMessages((cur) => cur.map((m) => (m.id === next.id ? next : m)))
            }
            onOpenNote={tools.openNoteById}
          />
          <TypingIndicator typing={typing} roomId={roomId} members={chat.members} />
          {selection.selecting ? (
            <SelectionBar
              count={selectedMessages.length}
              onForward={() => {
                if (!selectedMessages.some(canForward)) {
                  void antMessage.info('Không có tin nào chuyển tiếp được.');
                  return;
                }
                setForwarding(selectedMessages);
              }}
              onDelete={() => handleDeleteMany(selectedMessages, selection.clear)}
              onCancel={selection.clear}
            />
          ) : null}
          <Composer
            room={room}
            userId={user.id}
            members={chat.members}
            membersLoaded={chat.membersLoaded}
            online={chat.online}
            disabled={!roomId}
            locked={locked}
            error={error}
            form={composer.form}
            emitTyping={emitTyping}
            replyTo={composer.replyTo}
            editing={composer.editing}
            pendingImages={composer.pendingImages}
            pendingFiles={composer.pendingFiles}
            onCancelReply={() => composer.setReplyTo(null)}
            onCancelEdit={composer.cancelEdit}
            onAddImages={composer.addImages}
            onRemoveImage={composer.removeImage}
            onAddDocs={composer.addDocs}
            onRemoveDoc={composer.removeDoc}
            onOpenGallery={composer.openGallery}
            onSticker={composer.sendSticker}
            onPackSticker={(id) => composer.sendRich({ type: 'sticker', id })}
            onGif={composer.sendGif}
            onSend={composer.sendContent}
            onSendVoice={composer.sendVoice}
            onMarkRead={markRead}
            onTool={(kind) => tools.setToolModal(kind)}
            onLocation={() => void composer.sendLocation()}
            onCard={() => setCardPickerOpen(true)}
            blockedByMe={Boolean(room?.blockedByMe)}
            blockedMe={Boolean(room?.blockedMe)}
            onUnblock={() => room?.peerUserId && void setBlocked(room.peerUserId, false)}
          />
          <DropOverlay visible={drop.dragging} />
        </main>
      ) : workspace === 'tasks' ? (
        <TasksPage
          userId={user.id}
          onOpenTask={(task) => void openTask(task)}
          rooms={rooms}
          onAssign={(preset) => setAssigning(preset ?? {})}
          onAssigned={onAssigned}
        />
      ) : workspace === 'contacts' ? (
        <ContactsPage
          onlineUserIds={onlineUserIds}
          rooms={rooms}
          roomsMeta={roomList.roomsMeta}
          loadingOlderRooms={roomList.loadingOlderRooms}
          onLoadMoreRooms={roomList.loadMoreRooms}
          onViewProfile={setViewProfileId}
          onOpenRoom={openRoomFromContacts}
          onCreateGroup={() => setNewChat('group')}
        />
      ) : workspace === 'email' ? (
        <EmailPage />
      ) : workspace === 'docs' ? (
        <DocsPage user={user} onOpenMessage={openMessageFromDocs} />
      ) : workspace === 'hr' ? (
        <HrPage user={user} />
      ) : workspace === 'departments' ? (
        <DepartmentsPage user={user} />
      ) : workspace === 'admin' ? (
        <AdminPage user={user} />
      ) : workspace === 'gallery' ? (
        <GalleryPage />
      ) : workspace === 'news' ? (
        <NewsPage user={user} onDirtyChange={setLeaveBlocked} />
      ) : (
        <MeetingsPage user={user} />
      )}

      <SubmitPhotosModal
        open={sharingImages.length > 0}
        chatImages={sharingImages}
        onClose={() => setSharingImages([])}
      />

      <ForwardModal
        messages={forwarding}
        rooms={rooms}
        onClose={() => setForwarding([])}
        onForwarded={chat.handleForwarded}
        onSuccess={selection.clear}
      />
      {workspace === 'messenger' ? (
        rightPane === 'search' && room ? (
          <ConversationSearch
            room={room}
            members={chat.members}
            overlay={groupOverlay}
            onClose={() => {
              setRightPane('info');
              setGroupOverlay(false);
            }}
            onJump={(id, at) => void chat.jumpToMessage(id, at)}
          />
        ) : (
          <GroupDrawer
            room={room}
            members={chat.members}
            currentUserId={user.id}
            chatPhotos={chatPhotos}
            open={narrow ? groupOverlay : !infoHidden}
            overlay={groupOverlay}
            onClose={() => (narrow ? setGroupOverlay(false) : setInfoHidden(true))}
            onRoomUpdated={roomList.updateRoom}
            onMembersUpdated={chat.setMembers}
            onRoomRemoved={roomList.removeRoom}
            onJumpMessage={chat.jumpToMessage}
            onViewProfile={(uid) => setViewProfileId(uid)}
            prefs={roomPrefs}
            onEditReminder={tools.setEditingReminder}
            onCreateReminder={() => tools.setToolModal('reminder')}
            onOpenNote={tools.setOpenNote}
            onCreateNote={() => tools.setToolModal('note')}
            onCreateTask={() => tools.setToolModal('task')}
          />
        )
      ) : null}
      <GalleryModal
        open={composer.galleryOpen}
        loading={composer.galleryLoading}
        images={composer.gallery}
        onClose={() => composer.setGalleryOpen(false)}
        onPick={composer.pickFromGallery}
        onAddFiles={(files) => void composer.addToGallery(files)}
      />
      <ProfileDrawer
        open={profileOpen}
        user={user}
        onClose={() => setProfileOpen(false)}
        onUpdated={onUserUpdate}
        onUnblock={(userId) => setBlocked(userId, false)}
      />
      <ContactPickerModal
        open={cardPickerOpen}
        currentUserId={user.id}
        onClose={() => setCardPickerOpen(false)}
        onPick={(userId) => void composer.sendRich({ type: 'card', userId })}
      />
      <NewChatModal
        open={newChat !== null}
        initialTab={newChat ?? undefined}
        onClose={() => setNewChat(null)}
        onOpenRoom={openRoomFromContacts}
      />
      <UserProfileModal
        open={Boolean(viewProfileId)}
        userId={viewProfileId}
        currentUserId={user.id}
        online={isOtherUserOnline(presence, viewProfileId)}
        lastSeenAt={viewProfileId ? lastSeen[viewProfileId] : undefined}
        now={now}
        onClose={() => setViewProfileId(null)}
        onOpenRoom={openRoomFromContacts}
        onCall={(target, mode) => startCallWith(target, mode)}
        onSendCard={setCardUser}
        onSetBlocked={askBlock}
        blocked={profileBlocks}
      />
      <IncomingCallModal
        incoming={call.incomingCall}
        onAccept={(withVideo) => void call.acceptIncoming(withVideo)}
        onReject={call.rejectIncoming}
      />
      <CallOverlay
        call={call.activeCall}
        user={user}
        peers={call.peers}
        remoteStreams={call.remoteStreams}
        localStream={call.localStream}
        micOn={call.micOn}
        camOn={call.camOn}
        sharing={call.sharing}
        minimized={call.minimized}
        pinnedId={call.pinnedId}
        audioDeviceId={call.audioDeviceId}
        videoDeviceId={call.videoDeviceId}
        elapsed={call.elapsed}
        onToggleMic={() => void call.toggleMic()}
        onToggleCam={() => void call.toggleCam()}
        onToggleShare={() => void call.toggleShare()}
        onSelectAudioDevice={(id) => void call.selectAudioDevice(id)}
        onSelectVideoDevice={(id) => void call.selectVideoDevice(id)}
        onSetMinimized={call.setMinimized}
        onSetPinnedId={call.setPinnedId}
        onOpenChatRoom={openRoomFromNotice}
        onLeave={call.leaveCall}
      />
      <SendCardModal
        user={cardUser}
        rooms={rooms}
        onClose={() => setCardUser(null)}
        onSent={chat.handleForwarded}
      />
      <JoinGroupModal
        token={joinToken}
        onClose={() => {
          setJoinToken(null);
          history.replaceState(null, '', window.location.pathname + window.location.search);
        }}
        onOpenRoom={(targetRoom) => {
          setWorkspace('messenger');
          roomList.openRoom(targetRoom);
        }}
      />
      <PollCreateModal
        open={tools.toolModal === 'poll'}
        roomId={roomId}
        onClose={() => tools.setToolModal(null)}
        onCreated={chat.appendMessage}
      />
      <ReminderModal
        open={tools.toolModal === 'reminder' || Boolean(tools.editingReminder)}
        roomId={roomId}
        reminder={tools.editingReminder}
        onClose={() => {
          tools.setToolModal(null);
          tools.setEditingReminder(null);
        }}
      />
      <NoteModal
        open={tools.toolModal === 'note' || Boolean(tools.openNote)}
        roomId={roomId}
        note={tools.openNote}
        canEdit={tools.openNote && room ? canEditItem(room, tools.openNote.creatorId, user.id) : true}
        onClose={() => {
          tools.setToolModal(null);
          tools.setOpenNote(null);
        }}
      />
      <TaskModal
        open={tools.toolModal === 'task'}
        roomId={roomId}
        members={chat.members}
        currentUserId={user.id}
        isDirect={isDirect}
        task={null}
        onClose={() => tools.setToolModal(null)}
        onCreated={chat.appendMessage}
      />
      <TaskModal
        open={Boolean(assigning)}
        roomId=""
        members={[]}
        currentUserId={user.id}
        isDirect={false}
        task={null}
        rooms={rooms}
        preset={assigning ?? undefined}
        onClose={() => setAssigning(null)}
        onCreated={onAssigned}
      />
        </div>
      </LastSeenContext.Provider>
    </AppMenuContext.Provider>
  );
}
