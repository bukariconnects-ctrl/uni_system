-- Enable Realtime for attendance tables

-- Enable realtime for attendance_records
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;

-- Enable realtime for attendance_summaries
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_summaries;
