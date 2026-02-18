-- Migration 128: Add SET search_path to all SECURITY DEFINER functions
-- 
-- This migration hardens all existing SECURITY DEFINER functions by adding
-- SET search_path = public. This prevents potential search_path injection
-- attacks where a malicious schema could shadow public schema objects.
--
-- Uses ALTER FUNCTION (non-destructive) rather than CREATE OR REPLACE.
-- Total: 72 functions.

BEGIN;

ALTER FUNCTION public.admin_get_high_rejection_team_ups(p_min_requests integer, p_min_rejection_ratio numeric) SET search_path = public;
ALTER FUNCTION public.admin_get_stale_team_ups(p_hours_threshold integer) SET search_path = public;
ALTER FUNCTION public.approve_verification_request(request_id uuid, reviewer_id uuid, notes text) SET search_path = public;
ALTER FUNCTION public.auto_expire_stale_mentorship_requests() SET search_path = public;
ALTER FUNCTION public.cancel_mentorships_on_block() SET search_path = public;
ALTER FUNCTION public.check_team_up_cooldown(p_user_id uuid, p_event_name text, p_college_domain text) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_team_up_cooldowns() SET search_path = public;
ALTER FUNCTION public.clear_old_notifications(p_days integer) SET search_path = public;
ALTER FUNCTION public.consume_club_access_token(p_token text, p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.create_notification(p_user_id uuid, p_type text, p_content text, p_related_id uuid) SET search_path = public;
ALTER FUNCTION public.create_repost(p_original_post_id uuid, p_commentary_text text) SET search_path = public;
ALTER FUNCTION public.delete_repost(p_original_post_id uuid) SET search_path = public;
ALTER FUNCTION public.determine_user_role_from_graduation(p_graduation_year text, p_current_role user_role) SET search_path = public;
ALTER FUNCTION public.enforce_connection_college_domain() SET search_path = public;
ALTER FUNCTION public.enforce_message_college_domain() SET search_path = public;
ALTER FUNCTION public.enforce_team_up_deletion_cooldown() SET search_path = public;
ALTER FUNCTION public.ensure_same_college_domain(user_a uuid, user_b uuid) SET search_path = public;
ALTER FUNCTION public.expire_team_ups() SET search_path = public;
ALTER FUNCTION public.generate_club_access_token(p_club_name text, p_college_domain text, p_expires_in_days integer, p_notes text) SET search_path = public;
ALTER FUNCTION public.get_event_funnel_stats(p_days integer) SET search_path = public;
ALTER FUNCTION public.get_event_share_count(p_event_id uuid) SET search_path = public;
ALTER FUNCTION public.get_post_top_reactions(p_post_id uuid) SET search_path = public;
ALTER FUNCTION public.get_unread_notification_count(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_user_reaction(p_post_id uuid, p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.guard_mentor_slot_overflow() SET search_path = public;
ALTER FUNCTION public.guard_mentorship_status_transition() SET search_path = public;
ALTER FUNCTION public.increment_event_registration_click(event_id_param uuid) SET search_path = public;
ALTER FUNCTION public.increment_mentor_request_count() SET search_path = public;
ALTER FUNCTION public.increment_post_shares(post_id uuid) SET search_path = public;
ALTER FUNCTION public.is_valid_club_connection(p_requester_id uuid, p_receiver_id uuid) SET search_path = public;
ALTER FUNCTION public.list_club_access_tokens() SET search_path = public;
ALTER FUNCTION public.mark_all_notifications_read(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.notify_club_membership() SET search_path = public;
ALTER FUNCTION public.notify_comment() SET search_path = public;
ALTER FUNCTION public.notify_connection_change() SET search_path = public;
ALTER FUNCTION public.notify_event_registration() SET search_path = public;
ALTER FUNCTION public.notify_message() SET search_path = public;
ALTER FUNCTION public.notify_post_like() SET search_path = public;
ALTER FUNCTION public.notify_project_application() SET search_path = public;
ALTER FUNCTION public.notify_project_application_status() SET search_path = public;
ALTER FUNCTION public.notify_repost() SET search_path = public;
ALTER FUNCTION public.notify_team_up_closed() SET search_path = public;
ALTER FUNCTION public.notify_team_up_deletion() SET search_path = public;
ALTER FUNCTION public.notify_team_up_request() SET search_path = public;
ALTER FUNCTION public.on_mentor_pause_cancel_pending() SET search_path = public;
ALTER FUNCTION public.on_mentorship_request_accepted() SET search_path = public;
ALTER FUNCTION public.on_mentorship_request_created() SET search_path = public;
ALTER FUNCTION public.on_profile_delete_cancel_mentorships() SET search_path = public;
ALTER FUNCTION public.refresh_event_registration_counts(p_event_id uuid) SET search_path = public;
ALTER FUNCTION public.reject_verification_request(request_id uuid, reviewer_id uuid, notes text) SET search_path = public;
ALTER FUNCTION public.safe_accept_team_up_request(p_request_id uuid, p_responder_id uuid) SET search_path = public;
ALTER FUNCTION public.set_college_domain() SET search_path = public;
ALTER FUNCTION public.set_comment_college_domain() SET search_path = public;
ALTER FUNCTION public.set_content_college_domain() SET search_path = public;
ALTER FUNCTION public.set_event_registration_college_domain() SET search_path = public;
ALTER FUNCTION public.set_post_college_domain() SET search_path = public;
ALTER FUNCTION public.set_project_college_domain() SET search_path = public;
ALTER FUNCTION public.set_role_profile_college_domain() SET search_path = public;
ALTER FUNCTION public.set_user_college_domain() SET search_path = public;
ALTER FUNCTION public.sync_club_profile_to_clubs() SET search_path = public;
ALTER FUNCTION public.toggle_reaction(p_post_id uuid, p_reaction_type text) SET search_path = public;
ALTER FUNCTION public.trigger_update_role_from_graduation() SET search_path = public;
ALTER FUNCTION public.update_completed_team_ups_count() SET search_path = public;
ALTER FUNCTION public.update_mentor_mentee_count() SET search_path = public;
ALTER FUNCTION public.update_mentor_sla_metrics() SET search_path = public;
ALTER FUNCTION public.update_post_comments_count() SET search_path = public;
ALTER FUNCTION public.update_post_shares_count() SET search_path = public;
ALTER FUNCTION public.update_reposts_count() SET search_path = public;
ALTER FUNCTION public.update_team_up_member_stats() SET search_path = public;
ALTER FUNCTION public.update_team_up_request_stats() SET search_path = public;
ALTER FUNCTION public.validate_club_access_token(p_token text) SET search_path = public;
ALTER FUNCTION public.validate_team_up_request(p_team_up_id uuid, p_requester_id uuid, p_request_type text) SET search_path = public;

COMMIT;
