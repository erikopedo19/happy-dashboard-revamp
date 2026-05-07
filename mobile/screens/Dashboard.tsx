import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch today's appointments
  const { data: appointments = [], refetch: refetchAppointments } = useQuery({
    queryKey: ['dashboard_appointments'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:profiles(*),
          service:services(*),
          stylist:stylists(*)
        `)
        .eq('appointment_date', today)
        .order('appointment_time');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch quick stats
  const { data: stats = {}, refetch: refetchStats } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('status, price')
        .eq('appointment_date', today);

      if (appointmentsError) throw appointmentsError;

      const totalAppointments = todayAppointments?.length || 0;
      const completedAppointments = todayAppointments?.filter(a => a.status === 'completed').length || 0;
      const totalRevenue = todayAppointments?.reduce((sum, apt) => sum + (apt.price || 0), 0) || 0;

      return {
        totalAppointments,
        completedAppointments,
        totalRevenue,
      };
    },
  });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchAppointments(), refetchStats()]);
    setRefreshing(false);
  }, [refetchAppointments, refetchStats]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Today's Overview</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Appointments</Text>
            <Text style={styles.statsValue}>{stats.totalAppointments}</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Completed</Text>
            <Text style={styles.statsValue}>{stats.completedAppointments}</Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Revenue</Text>
            <Text style={styles.statsValue}>${stats.totalRevenue}</Text>
          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Appointments</Text>
          {appointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No appointments for today</Text>
            </View>
          ) : (
            appointments.map((appointment: any) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => {
                  // Navigate to appointment details
                }}
              >
                <View style={styles.appointmentHeader}>
                  <Text style={styles.appointmentTime}>
                    {appointment.appointment_time.slice(0, 5)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: appointment.status === 'completed' ? '#22c55e' : '#3b82f6' }
                  ]}>
                    <Text style={styles.statusText}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.customerName}>
                  {appointment.customer?.name || 'Unknown Customer'}
                </Text>
                <Text style={styles.serviceName}>
                  {appointment.service?.name || 'Unknown Service'}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  appointmentCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
  },
});
