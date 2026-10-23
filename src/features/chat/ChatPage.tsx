import { useEffect, useMemo, useState } from 'react';
import { message as antMessage } from 'antd';
import { DocsPage } from '@/features/docs/DocsPage';
import { EmailPage } from '@/features/email/EmailPage';
import { MeetingsPage } from '@/features/meetings/MeetingsPage';
import { ProfileDrawer } from '@/features/profile/ProfileDrawer';
import { UserProfileModal } from '@/features/profile/UserProfileModal';
import { useMyProfile } from '@/features/profile/hooks/useMyProfile';
import type { ChatMessage, Room, User } from '@/types';
import { ChatHeader } from './components/ChatHeader';
import { ChatSidebar } from './components/ChatSidebar';
import { Composer } from './components/Composer';
import { ForwardModal } from './components/ForwardModal';
import { GalleryModal } from './components/GalleryModal';
import { GroupDrawer } from './components/GroupDrawer';
import { MessageList } from './components/MessageList';
import { NavRail } from './components/NavRail';
import { NewChatModal } from './components/NewChatModal';
import { PinBar } from './components/PinBar';
import { TypingIndicator } from './components/TypingIndicator';
import { useChatNotifications } from './hooks/useChatNotifications';
import { useChatRoom } from './hooks/useChatRoom';
import { useChatSocket } from './hooks/useChatSocket';
import { useComposer } from './hooks/useComposer';
import { useMessageActions } from './hooks/useMessageActions';
import { useRoomList } from './hooks/useRoomList';
import { useTypingSignal } from './hooks/useTypingSignal';
import { useWorkspace } from './hooks/useWorkspace';
import { photosFromMessages } from './utils/media';
import { handleFromEmail } from './utils/mentions';
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
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const myHandle = handleFromEmail(user.email);

  const { changeAvatar } = useMyProfile(user, onUserUpdate);
  const { workspace, setWorkspace, isViewingChat } = useWorkspace();
  const roomList = useRoomList({ isViewingChat, setError });
  const { rooms, room, roomId } = roomList;

  const openRoomFromNotice = (id: string) => {
    setWorkspace('messenger');
    const target = rooms.find((r) => r.id === id);
    if (target) {
      roomList.selectRoom(target);
    } else {
      void antMessage.info('Cuộc trò chuyện không còn trong danh sách.');
    }
  };

  useChatNotifications({ onOpenRoom: openRoomFromNotice });
  const chat = useChatRoom({
    user,
    roomId,
    roomIdRef: roomList.roomIdRef,
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
  const { handleMessageAction, handleReact } = useMessageActions({
    roomId,
    setMessages: chat.setMessages,
    setPins: chat.setPins,
    onReply: composer.setReplyTo,
    onForward: setForwarding,
    onEdit: composer.startEdit,
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
  }, [roomId]);

  const isDirect = Boolean(room && isDirectRoom(room));
  const presence: Presence = { myId: user.id, online: chat.online, onlineUserIds };
  const isPeerOnline = isOtherUserOnline(presence, peerUserIdOf(room, chat.members, user.id));
  const isGroupOnline = hasOnlineMember(presence, chat.members);
  const onlineMembersCount = countOnlineMembers(presence, chat.members);
  const team = user.team ?? room?.team ?? 'sale';
  const chatPhotos = useMemo(() => photosFromMessages(chat.messages), [chat.messages]);
  const markRead = () => chat.markMessageRead();

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
          onOpenProfile={() => setProfileOpen(true)}
          onChangeAvatar={changeAvatar}
        />
      ) : null}

      {workspace === 'messenger' ? (
        <main className="chat">
          <ChatHeader
            room={room}
            isDirect={isDirect}
            isPeerOnline={isPeerOnline}
            isGroupOnline={isGroupOnline}
            membersCount={chat.members.length}
            onlineMembersCount={onlineMembersCount}
            onToggleInfo={() => setGroupOverlay((current) => !current)}
          />
          <PinBar pins={chat.pins} onJump={chat.jumpToMessage} />
          <MessageList
            listRef={chat.listRef}
            messages={chat.messages}
            reads={chat.reads}
            userId={user.id}
            myHandle={myHandle}
            loadingOlder={chat.loadingOlder}
            pending={chat.pending}
            onLoadOlder={chat.loadOlder}
            onMarkRead={markRead}
            onViewProfile={setViewProfileId}
            onAction={handleMessageAction}
            onReact={handleReact}
            onJump={chat.jumpToMessage}
          />
          <TypingIndicator typing={typing} roomId={roomId} members={chat.members} />
          <Composer
            room={room}
            userId={user.id}
            members={chat.members}
            membersLoaded={chat.membersLoaded}
            online={chat.online}
            disabled={!roomId}
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
            onGif={composer.sendGif}
            onSend={composer.sendContent}
            onMarkRead={markRead}
          />
        </main>
      ) : workspace === 'email' ? (
        <EmailPage />
      ) : workspace === 'docs' ? (
        <DocsPage user={user} />
      ) : (
        <MeetingsPage user={user} />
      )}

      <ForwardModal
        message={forwarding}
        rooms={rooms}
        onClose={() => setForwarding(null)}
        onForwarded={chat.handleForwarded}
      />
      {workspace === 'messenger' ? (
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
        />
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
        onOpenRoom={roomList.openRoom}
      />
    </div>
  );
}
