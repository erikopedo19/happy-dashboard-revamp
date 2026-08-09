-- The on_notification_insert_send_push trigger was dropped during an earlier migration and never recreated.
-- Re-attach it so push notifications go out for booking created/cancelled/rescheduled notifications.
DROP TRIGGER IF EXISTS on_notification_insert_send_push ON public.notifications;
CREATE TRIGGER on_notification_insert_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();
