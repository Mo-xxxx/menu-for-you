CREATE TABLE public.favourite_menus (
 user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
 restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, restaurant_id)
);
GRANT SELECT, INSERT, DELETE ON public.favourite_menus TO authenticated;
GRANT ALL ON public.favourite_menus TO service_role;
ALTER TABLE public.favourite_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own favourite menus" ON public.favourite_menus FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Add own favourite menus" ON public.favourite_menus FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Remove own favourite menus" ON public.favourite_menus FOR DELETE TO authenticated USING (auth.uid() = user_id);