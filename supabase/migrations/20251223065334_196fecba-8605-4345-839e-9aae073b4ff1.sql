-- Insert test department for establishment registration
INSERT INTO public.departments (name, code, description, state, district, phone, email, is_active)
VALUES 
  ('Labour Department - Telangana', 'DEPT-TS-001', 'Government Labour Department for Telangana State', 'Telangana', 'Hyderabad', '+919876543210', 'labour.ts@gov.in', true),
  ('Labour Department - Maharashtra', 'DEPT-MH-001', 'Government Labour Department for Maharashtra State', 'Maharashtra', 'Mumbai', '+919876543211', 'labour.mh@gov.in', true),
  ('Labour Department - Karnataka', 'DEPT-KA-001', 'Government Labour Department for Karnataka State', 'Karnataka', 'Bengaluru', '+919876543212', 'labour.ka@gov.in', true);