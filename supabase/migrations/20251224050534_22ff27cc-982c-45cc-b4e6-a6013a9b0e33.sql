-- Allow public read access to active departments for registration purposes
CREATE POLICY "Anyone can view active departments" 
ON public.departments 
FOR SELECT 
USING (is_active = true);