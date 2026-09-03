-- Keep personal email addresses out of the public transport directory.
delete from public.employee_transport_directory
where lower(email) = 'phooriwat456@gmail.com';
