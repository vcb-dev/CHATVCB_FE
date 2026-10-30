import { useEffect, useMemo, useState } from 'react';
import { message as antMessage } from 'antd';
import { ContactsPage } from '@/features/contacts/ContactsPage';
import { DocsPage } from '@/features/docs/DocsPage';
import { EmailPage } from '@/features/email/EmailPage';
import { DepartmentsPage } from '@/features/departments/DepartmentsPage';
import { HrPage } from '@/features/hr/HrPage';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';
import { ProfileDrawer } from '@/features/profile/ProfileDrawer';
import { UserProfileModal } from '@/features/profile/UserProfileModal';
import { useMyProfile } from '@/features/profile/hooks/useMyProfile';
import type { ChatMessage, Room, User } from '@/types';
import { ChatHeader } from './components/ChatHeader';
import { ChatSidebar } from './components/ChatSidebar';
import { Composer } from './components/Composer';
import { ContactPickerModal } from './components/ContactPickerModal';
import { ConversationSearch } from './components/ConversationSearch';
import { ForwardModal } from './components/ForwardModal';
import { GalleryModal } from './components/GalleryModal';
import { GroupDrawer } from './components/GroupDrawer';
import { JoinGroupModal } from './components/JoinGroupModal';
import { MessageList } from './components/MessageList';
import { NavRail } from './components/NavRail';
import { NewChatModal } from './components/NewChatModal';
import { NoteModal } from './components/NoteModal';
import { PinBar } from './components/PinBar';
import { SelectionBar } from './components/SelectionBar';
import { PollCreateModal } from './components/PollCreateModal';
import { ReminderModal } from './components/ReminderModal';
import { TypingIndicator } from './components/TypingIndicator';
import { parseJoinHash } from './utils/invite';
import { canEditItem } from './utils/rooms';
import { useChatNotifications } from './hooks/useChatNotifications';
import { useChatRoom } from './hooks/useChatRoom';
import { useBlockUser } from './hooks/useBlockUser';
import { useChatSocket } from './hooks/useChatSocket';
import { useComposer } from './hooks/useComposer';
import { useMessageActions } from './hooks/useMessageActions';
import { useMessageSelection } from './hooks/useMessageSelection';
import { useRoomList } from './hooks/useRoomList';
import { useRoomPrefs } from './hooks/useRoomPrefs';
import { useRoomTools } from './hooks/useRoomTools';
import { useTypingSignal } from './hooks/useTypingSignal';
import { useWorkspace } from './hooks/useWorkspace';
import { DropOverlay } from './components/DropOverlay';
import { useFileDrop } from './hooks/useFileDrop';
import { canForward } from './utils/forward';
import { isSelectable } from './utils/selection';
import { photosFromMessages, splitDropped } from './utils/media';
import { handleFromEmail, mentionsAllowed } from './utils/mentions';
import {
  countOnlineMembers,
  hasOnlineMember,
  isOtherRoomOnline,
  isOtherUserOnline,
  peerUserIdOf,
  type Presence,
} from './utils/presence';
import { isDirectRoom } from './utils/rooms';

type Props = {
  user: User;
  onLogout: () => void;
  onUserUpdate: (payload: { token: string; user: User }) => void;
};

export function ChatPage({ user, onLogout, onUserUpdate }: Props) {
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [groupOverlay, setGroupOverlay] = useState(false);
  const [rightPane, setRightPane] = useState<'info' | 'search'>('info');
  const [forwarding, setForwarding] = useState<ChatMessage[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
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

  const { changeAvatar } = useMyProfile(user, onUserUpdate);
  const { workspace, setWorkspace, isViewingChat } = useWorkspace();
  const roomList = useRoomList({ isViewingChat, setError });
  const { rooms, room, roomId } = roomList;
  const { setBlocked } = useBlockUser({ setRooms: roomList.setRooms });
  const roomPrefs = useRoomPrefs({ setRooms: roomList.setRooms, removeRoom: roomList.removeRoom });
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

  useChatNotifications({ onOpenRoom: openRoomFromNotice });
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
  const composer = useComposer({
    roomId,
    messages: chat.messages,
    appendMessage: chat.appendMessage,
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
    onEdit: composer.startEdit,
    onSelect: selection.start,
    onSavedToCloud: chat.handleForwarded,
  });
  const { onlineUserIds, typing, emitTyping } = useChatSocket({
    user,
    myHandle,
    roomId,
    roomIdRef: roomList.roomIdRef,
    rooms,
    refreshRooms: roomList.refreshRooms,
    removeRoom: roomList.removeRoom,
    openRoom: openRoomFromNotice,
    isViewingChat,
    markMessageRead: chat.markMessageRead,
    setMessages: chat.setMessages,
    setPending: chat.setPending,
    setRooms: roomList.setRooms,
    setOnline: chat.setOnline,
    setReads: chat.setReads,
    setPins: chat.setPins,
    setMembers: chat.setMembers,
  });
  useTypingSignal({ roomId, draft: composer.draft, emitTyping });

  useEffect(() => {
    setGroupOverlay(false);
    setRightPane('info');
  }, [roomId]);

  const isDirect = Boolean(room && isDirectRoom(room));
  const locked = Boolean(room?.settings?.adminOnlySend && room.myRole === 'member');
  const canPin = !(room?.settings?.adminOnlyPin && room.myRole === 'member');
  const presence: Presence = { myId: user.id, online: chat.online, onlineUserIds };
  const isPeerOnline = isOtherUserOnline(presence, peerUserIdOf(room, chat.members, user.id));
  const isGroupOnline = hasOnlineMember(presence, chat.members);
  const onlineMembersCount = countOnlineMembers(presence, chat.members);
  const team = user.team ?? room?.team ?? 'sale';
  const chatPhotos = useMemo(() => photosFromMessages(chat.messages), [chat.messages]);
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

  return (
    <div className={`app-shell module-${workspace}`}>
      <NavRail
        workspace={workspace}
        user={user}
        onSelect={(next) => {
          setWorkspace(next);
          setGroupOverlay(false);
        }}
        onOpenProfile={() => setProfileOpen(true)}
        onLogout={onLogout}
      />

      {workspace === 'messenger' ? (
        <ChatSidebar
          user={user}
          team={team}
          rooms={rooms}
          roomId={roomId}
          roomsMeta={roomList.roomsMeta}
          loadingOlderRooms={roomList.loadingOlderRooms}
          searchText={searchText}
          isRoomOnline={isRoomOnline}
          onSearchTextChange={setSearchText}
          onSelectRoom={roomList.selectRoom}
          onOpenRoom={roomList.openRoom}
          onOpenMessage={chat.openMessage}
          onLoadMoreRooms={roomList.loadMoreRooms}
          onNewChat={() => setNewChatOpen(true)}
          onOpenCloud={tools.openCloud}
          onOpenProfile={() => setProfileOpen(true)}
          onChangeAvatar={changeAvatar}
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
            isGroupOnline={isGroupOnline}
            membersCount={chat.members.length}
            onlineMembersCount={onlineMembersCount}
            onToggleInfo={() => {
              setRightPane('info');
              setGroupOverlay((current) => !current);
            }}
            onSearch={() => {
              setRightPane('search');
              setGroupOverlay(true);
            }}
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
            draft={composer.draft}
            replyTo={composer.replyTo}
            editing={composer.editing}
            pendingImages={composer.pendingImages}
            pendingFiles={composer.pendingFiles}
            onDraftChange={composer.setDraft}
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
            onUnblock={() => room?.peerUserId && void setBlocked(room.peerUserId, false)}
          />
          <DropOverlay visible={drop.dragging} />
        </main>
      ) : workspace === 'contacts' ? (
        <ContactsPage
          onlineUserIds={onlineUserIds}
          onViewProfile={setViewProfileId}
          onOpenRoom={openRoomFromContacts}
        />
      ) : workspace === 'email' ? (
        <EmailPage />
      ) : workspace === 'docs' ? (
        <DocsPage user={user} />
      ) : workspace === 'hr' ? (
        <HrPage />
      ) : workspace === 'departments' ? (
        <DepartmentsPage />
      ) : (
        <MeetingsPage user={user} />
      )}

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
            overlay={groupOverlay}
            onClose={() => setGroupOverlay(false)}
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
      />
      <ContactPickerModal
        open={cardPickerOpen}
        currentUserId={user.id}
        onClose={() => setCardPickerOpen(false)}
        onPick={(userId) => void composer.sendRich({ type: 'card', userId })}
      />
      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onOpenRoom={roomList.openRoom}
      />
      <UserProfileModal
        open={Boolean(viewProfileId)}
        userId={viewProfileId}
        currentUserId={user.id}
        onClose={() => setViewProfileId(null)}
        onOpenRoom={openRoomFromContacts}
        onSetBlocked={setBlocked}
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
    </div>
  );
}
