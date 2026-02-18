-- ============================================================================
-- 036_notification_triggers.sql - Fix Notification System
-- Creates triggers to automatically generate notifications for:
-- - Connection requests (new request, accepted)
-- - Post likes
-- - Comments on posts
-- - Message received (first message in conversation)
-- ============================================================================

BEGIN;

-- ============================================================================
-- NOTIFICATION CREATION FUNCTION
-- Generic function to create notifications with proper college_domain inheritance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_content text,
  p_related_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
  v_college_domain text;
BEGIN
  -- Get the user's college domain for proper isolation
  SELECT college_domain INTO v_college_domain
  FROM public.profiles
  WHERE id = p_user_id;
  
  -- Insert the notification
  INSERT INTO public.notifications (
    user_id,
    type,
    content,
    related_id,
    college_domain,
    read,
    created_at
  ) VALUES (
    p_user_id,
    p_type,
    p_content,
    p_related_id,
    v_college_domain,
    false,
    now()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ============================================================================
-- CONNECTION REQUEST NOTIFICATION TRIGGER
-- Notifies receiver when someone sends a connection request
-- Notifies requester when their request is accepted
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_connection_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_requester_name text;
  v_receiver_name text;
  v_content text;
BEGIN
  -- Get names for notification content
  SELECT full_name INTO v_requester_name 
  FROM public.profiles 
  WHERE id = NEW.requester_id;
  
  SELECT full_name INTO v_receiver_name 
  FROM public.profiles 
  WHERE id = NEW.receiver_id;

  IF TG_OP = 'INSERT' THEN
    -- New connection request - notify the receiver
    v_content := COALESCE(v_requester_name, 'Someone') || ' sent you a connection request';
    PERFORM public.create_notification(
      NEW.receiver_id,
      'connection',
      v_content,
      NEW.id
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed
    IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
      -- Connection accepted - notify the original requester
      v_content := COALESCE(v_receiver_name, 'Someone') || ' accepted your connection request';
      PERFORM public.create_notification(
        NEW.requester_id,
        'connection',
        v_content,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_connection_request ON public.connections;
CREATE TRIGGER notify_connection_request
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_connection_change();

-- ============================================================================
-- POST LIKE NOTIFICATION TRIGGER
-- Notifies post author when someone likes their post
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_post_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_author_id uuid;
  v_liker_name text;
  v_content text;
BEGIN
  -- Get the post author
  SELECT user_id INTO v_post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user liked their own post
  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get the liker's name
  SELECT full_name INTO v_liker_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  v_content := COALESCE(v_liker_name, 'Someone') || ' liked your post';
  
  PERFORM public.create_notification(
    v_post_author_id,
    'like',
    v_content,
    NEW.post_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_post_like ON public.post_likes;
CREATE TRIGGER notify_post_like
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_post_like();

-- ============================================================================
-- COMMENT NOTIFICATION TRIGGER
-- Notifies post author when someone comments on their post
-- Notifies parent comment author on replies
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_author_id uuid;
  v_parent_comment_author_id uuid;
  v_commenter_name text;
  v_content text;
BEGIN
  -- Get the post author
  SELECT user_id INTO v_post_author_id
  FROM public.posts
  WHERE id = NEW.post_id;
  
  -- Get the commenter's name
  SELECT full_name INTO v_commenter_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- If this is a reply to another comment, notify the parent comment author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_comment_author_id
    FROM public.comments
    WHERE id = NEW.parent_id;
    
    -- Don't notify if replying to own comment
    IF v_parent_comment_author_id IS NOT NULL AND v_parent_comment_author_id != NEW.user_id THEN
      v_content := COALESCE(v_commenter_name, 'Someone') || ' replied to your comment';
      PERFORM public.create_notification(
        v_parent_comment_author_id,
        'comment',
        v_content,
        NEW.id
      );
    END IF;
  END IF;
  
  -- Notify post author (if not commenting on own post and not already notified as parent commenter)
  IF v_post_author_id != NEW.user_id AND 
     (v_parent_comment_author_id IS NULL OR v_post_author_id != v_parent_comment_author_id) THEN
    v_content := COALESCE(v_commenter_name, 'Someone') || ' commented on your post';
    PERFORM public.create_notification(
      v_post_author_id,
      'comment',
      v_content,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_comment ON public.comments;
CREATE TRIGGER notify_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment();

-- ============================================================================
-- MESSAGE NOTIFICATION TRIGGER
-- Notifies receiver when they get a new message
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name text;
  v_content text;
BEGIN
  -- Get the sender's name
  SELECT full_name INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;
  
  v_content := COALESCE(v_sender_name, 'Someone') || ' sent you a message';
  
  PERFORM public.create_notification(
    NEW.receiver_id,
    'message',
    v_content,
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_message ON public.messages;
CREATE TRIGGER notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_message();

-- ============================================================================
-- EVENT REGISTRATION NOTIFICATION TRIGGER
-- Notifies event creator when someone registers for their event
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_event_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_creator_id uuid;
  v_registrant_name text;
  v_event_title text;
  v_content text;
BEGIN
  -- Get the event creator and title
  SELECT created_by, title INTO v_event_creator_id, v_event_title
  FROM public.events
  WHERE id = NEW.event_id;
  
  -- Don't notify if creator registers for their own event
  IF v_event_creator_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get registrant name
  SELECT full_name INTO v_registrant_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  v_content := COALESCE(v_registrant_name, 'Someone') || ' registered for your event: ' || COALESCE(v_event_title, 'your event');
  
  PERFORM public.create_notification(
    v_event_creator_id,
    'event',
    v_content,
    NEW.event_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_event_registration ON public.event_registrations;
CREATE TRIGGER notify_event_registration
  AFTER INSERT ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_registration();

-- ============================================================================
-- CLUB MEMBERSHIP NOTIFICATION TRIGGER
-- Notifies club when someone joins
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_club_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_club_owner_id uuid;
  v_member_name text;
  v_club_name text;
  v_content text;
BEGIN
  -- Get the club owner (creator) and name
  SELECT created_by, name INTO v_club_owner_id, v_club_name
  FROM public.clubs
  WHERE id = NEW.club_id;
  
  -- Don't notify if owner joins their own club
  IF v_club_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get member name
  SELECT full_name INTO v_member_name
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  v_content := COALESCE(v_member_name, 'Someone') || ' joined your club: ' || COALESCE(v_club_name, 'your club');
  
  PERFORM public.create_notification(
    v_club_owner_id,
    'club',
    v_content,
    NEW.club_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_club_membership ON public.club_members;
CREATE TRIGGER notify_club_membership
  AFTER INSERT ON public.club_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_club_membership();

-- ============================================================================
-- PROJECT APPLICATION NOTIFICATION TRIGGER
-- Notifies project owner when someone applies to their project
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_project_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_owner_id uuid;
  v_applicant_name text;
  v_project_title text;
  v_content text;
BEGIN
  -- Get the project owner and title
  SELECT owner_id, title INTO v_project_owner_id, v_project_title
  FROM public.collab_projects
  WHERE id = NEW.project_id;
  
  -- Get applicant name
  SELECT full_name INTO v_applicant_name
  FROM public.profiles
  WHERE id = NEW.applicant_id;
  
  v_content := COALESCE(v_applicant_name, 'Someone') || ' applied to your project: ' || COALESCE(v_project_title, 'your project');
  
  PERFORM public.create_notification(
    v_project_owner_id,
    'project',
    v_content,
    NEW.project_id
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_project_application ON public.collab_project_applications;
CREATE TRIGGER notify_project_application
  AFTER INSERT ON public.collab_project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_project_application();

-- ============================================================================
-- HELPER FUNCTION: Get unread notification count
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id AND read = false;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Mark all notifications as read
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE user_id = p_user_id AND read = false;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Clear old notifications (older than 30 days)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.clear_old_notifications(p_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.notifications
  WHERE created_at < now() - (p_days || ' days')::interval
    AND read = true;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

COMMIT;
