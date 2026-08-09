
-- Re-attach missing triggers on appointments and notifications
DROP TRIGGER IF EXISTS appointments_send_booking_email ON public.appointments;
CREATE TRIGGER appointments_send_booking_email
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_booking_email();

DROP TRIGGER IF EXISTS appointments_offer_waitlist_on_cancel ON public.appointments;
CREATE TRIGGER appointments_offer_waitlist_on_cancel
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_offer_waitlist_on_cancel();

DROP TRIGGER IF EXISTS appointments_check_stylist ON public.appointments;
CREATE TRIGGER appointments_check_stylist
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.check_stylist_appointment();

DROP TRIGGER IF EXISTS notifications_send_push ON public.notifications;
CREATE TRIGGER notifications_send_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_send_push();

DROP TRIGGER IF EXISTS reviews_recalc_rating ON public.reviews;
CREATE TRIGGER reviews_recalc_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_business_rating();
