# 🛠 Lut Lat Aung – Dev Log

> A running journal of daily progress, bugs, thoughts, and experiments.

---

## 📅 July 2025

### 🧠 July 4 – Messaging Refactor + Role Setup
- ✅ Refactored `ConversationBox` and `useConversation` to use a single room per `author-editor` pair instead of per-manuscript.
- ✅ Fixed message visibility: messages now properly display on both sides using `.sort().join('-')` for consistent room IDs.
- ⚠️ Found that editor messages were going to wrong authors because of incorrect `author_id` assignment — fixed by ensuring `authorId` is from manuscript not editor session.
- ✅ Added fallback for missing `full_name` when assigning profile name on upgrade to `author`.
- ✅ Added author message box on `/author/manuscripts` page.

---

## 🔧 Todos / Next Steps
- [ ] Add notification (browser or badge) for unread messages
- [ ] Improve real-time messaging reliability (consider replication config on Supabase)
- [ ] Refactor RLS policies to simplify per-role access
- [ ] Create admin view to assign roles (`editor`, `publisher`, etc)
- [ ] Set up email verification or 2FA

---

## 🧪 Experiments
- Tested message delivery between author/editor using same account — worked after room_id correction.
- Found that Supabase `user_metadata` is sometimes empty on email/password signup.

---

## 💡 Notes
- Supabase `user_metadata` is only populated automatically for OAuth (e.g. Google).
- Manual profile `name` should be captured on signup form for non-OAuth users.
- Realtime subscriptions require `Replication` enabled in Supabase settings for the table (e.g. `messages`).

---

