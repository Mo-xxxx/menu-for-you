
INSERT INTO public.ingredients(name, allergen_group) VALUES
('rice',NULL),('chickpeas',NULL),('tomato',NULL),('onion',NULL),('garlic',NULL),('spinach',NULL),('lentils',NULL),('coconut milk',NULL),
('chicken',NULL),('lamb',NULL),('beef',NULL),('tofu','soy'),('soy sauce','soy'),('wheat noodles','gluten'),('rice noodles',NULL),
('bread','gluten'),('pasta','gluten'),('cheese','milk'),('yoghurt','milk'),('butter','milk'),('cream','milk'),('egg','egg'),
('peanuts','peanuts'),('cashews','tree_nuts'),('almonds','tree_nuts'),('sesame','sesame'),('prawns','crustaceans'),('salmon','fish'),
('mushroom',NULL),('sweet potato',NULL),('avocado',NULL),('quinoa',NULL),('ginger',NULL),('chilli',NULL),('lettuce',NULL),('cucumber',NULL),
('potato',NULL),('carrot',NULL),('celery','celery'),('mustard','mustard'),('pepper',NULL),('lemon',NULL),('basil',NULL),('aubergine',NULL);

DO $$
DECLARE rid uuid; iid uuid; r record; ing text; k boolean; n text;
BEGIN
  FOR r IN SELECT * FROM (VALUES
   ('Green Bowl Kitchen','Vegan',51.5152,-0.1310,'08:00–21:00',1),
   ('Spice Route','Indian',51.5131,-0.1342,'12:00–23:00',2),
   ('Noodle House Soho','Asian',51.5128,-0.1318,'11:30–22:30',2),
   ('Halal Grill & Co','Middle Eastern',51.5170,-0.1270,'11:00–23:00',1),
   ('Pasta Fresca','Italian',51.5110,-0.1285,'12:00–22:00',2),
   ('Soup & Steam','British',51.5160,-0.1365,'07:30–19:00',1),
   ('Sushi Lane','Japanese',51.5185,-0.1330,'12:00–22:00',3),
   ('Falafel Corner','Middle Eastern',51.5139,-0.1255,'10:00–22:00',1),
   ('Thai Garden','Thai',51.5200,-0.1290,'12:00–22:30',2),
   ('The Baked Potato','British',51.5098,-0.1340,'10:00–20:00',1)
  ) AS t(name,cuisine,lat,lng,hours,band) LOOP
    INSERT INTO restaurants(name,cuisine,lat,lng,opening_hours,price_band) VALUES (r.name,r.cuisine,r.lat,r.lng,r.hours,r.band);
  END LOOP;

  FOR r IN SELECT * FROM (VALUES
   ('Green Bowl Kitchen','Warm lentil and spinach stew',8.50,'{vegan,vegetarian,halal,gluten-free,dairy-free}'::text[],true,true,'verified','A gentle, warming stew of red lentils and spinach.','*lentils,*spinach,tomato,onion,garlic,ginger'),
   ('Green Bowl Kitchen','Quinoa avocado salad',9.00,'{vegan,vegetarian,gluten-free,dairy-free}',false,true,'verified','A fresh cold salad with quinoa and avocado.','*quinoa,*avocado,cucumber,lettuce,lemon'),
   ('Green Bowl Kitchen','Sweet potato and tofu bowl',10.50,'{vegan,vegetarian,dairy-free}',true,true,'restaurant_stated','Roasted sweet potato with tofu and sesame.','*sweet potato,*tofu,soy sauce,sesame,rice'),
   ('Green Bowl Kitchen','Peanut satay rice bowl',9.50,'{vegan,vegetarian,dairy-free}',true,false,'restaurant_stated','Rice with a rich peanut sauce.','*rice,*peanuts,carrot,coconut milk,chilli'),
   ('Spice Route','Chana masala with rice',9.00,'{vegan,vegetarian,halal,gluten-free,dairy-free}',true,false,'restaurant_stated','Chickpeas in a mild tomato sauce with rice.','*chickpeas,*rice,tomato,onion,garlic,ginger'),
   ('Spice Route','Chicken korma',12.50,'{halal,gluten-free}',true,false,'restaurant_stated','Creamy mild chicken curry with cashews.','*chicken,*cream,cashews,onion,rice'),
   ('Spice Route','Dal tadka',7.50,'{vegetarian,halal,gluten-free}',true,true,'ai_inferred','Yellow lentils cooked with butter and spices.','*lentils,butter,garlic,chilli,tomato'),
   ('Spice Route','Lamb biryani',13.50,'{halal,gluten-free}',true,false,'restaurant_stated','Spiced rice baked with tender lamb.','*lamb,*rice,yoghurt,onion,almonds'),
   ('Noodle House Soho','Chicken ramen',12.00,'{}',true,false,'restaurant_stated','Hot broth with wheat noodles and chicken.','*wheat noodles,*chicken,egg,soy sauce,mushroom'),
   ('Noodle House Soho','Vegetable pho',10.00,'{vegan,vegetarian,gluten-free,dairy-free}',true,true,'ai_inferred','Light, clear broth with rice noodles and herbs.','*rice noodles,*mushroom,ginger,basil,chilli'),
   ('Noodle House Soho','Prawn pad thai',11.50,'{gluten-free,dairy-free}',true,false,'ai_inferred','Stir-fried rice noodles with prawns and peanuts.','*rice noodles,*prawns,peanuts,egg'),
   ('Noodle House Soho','Tofu miso soup',6.50,'{vegan,vegetarian,dairy-free}',true,true,'restaurant_stated','A small, light soup with tofu.','*tofu,soy sauce,mushroom'),
   ('Halal Grill & Co','Chicken shawarma wrap',8.00,'{halal}',true,false,'restaurant_stated','Grilled chicken in flatbread with garlic sauce.','*chicken,*bread,garlic,yoghurt,lettuce'),
   ('Halal Grill & Co','Lamb kofta plate',12.00,'{halal,gluten-free}',true,false,'verified','Grilled lamb kofta with rice and salad.','*lamb,*rice,onion,cucumber,tomato'),
   ('Halal Grill & Co','Grilled chicken salad',9.50,'{halal,gluten-free,dairy-free}',false,true,'verified','Light salad with grilled chicken and lemon.','*chicken,*lettuce,cucumber,tomato,lemon'),
   ('Halal Grill & Co','Lentil soup',5.50,'{vegan,vegetarian,halal,gluten-free,dairy-free}',true,true,'restaurant_stated','Smooth, warming red lentil soup.','*lentils,carrot,onion,lemon'),
   ('Pasta Fresca','Tomato basil pasta',10.00,'{vegetarian}',true,false,'restaurant_stated','Simple pasta with tomato and basil.','*pasta,*tomato,basil,garlic,cheese'),
   ('Pasta Fresca','Mushroom risotto',12.00,'{vegetarian,gluten-free}',true,false,'restaurant_stated','Creamy rice with mushrooms and cheese.','*rice,*mushroom,butter,cheese,onion'),
   ('Pasta Fresca','Minestrone soup',7.00,'{vegan,vegetarian,dairy-free}',true,true,'ai_inferred','Vegetable soup with small pasta.','*tomato,*carrot,celery,pasta,onion'),
   ('Pasta Fresca','Aubergine parmigiana',11.00,'{vegetarian,gluten-free}',true,false,'ai_inferred','Baked aubergine with tomato and cheese.','*aubergine,*cheese,tomato,basil'),
   ('Soup & Steam','Carrot and ginger soup',5.00,'{vegan,vegetarian,halal,gluten-free,dairy-free}',true,true,'verified','Smooth, light carrot soup with ginger.','*carrot,*ginger,onion'),
   ('Soup & Steam','Chicken and vegetable broth',6.50,'{gluten-free,dairy-free}',true,true,'verified','Clear broth with chicken and vegetables.','*chicken,*carrot,celery,potato,onion'),
   ('Soup & Steam','Mushroom soup with bread',6.00,'{vegetarian}',true,true,'restaurant_stated','Creamy mushroom soup with bread.','*mushroom,*cream,bread,onion'),
   ('Soup & Steam','Tomato soup',4.50,'{vegan,vegetarian,halal,gluten-free,dairy-free}',true,true,'verified','Classic smooth tomato soup.','*tomato,onion,basil,garlic'),
   ('Sushi Lane','Salmon nigiri set',14.00,'{gluten-free,dairy-free}',false,true,'restaurant_stated','Rice with fresh salmon slices.','*salmon,*rice,soy sauce'),
   ('Sushi Lane','Avocado cucumber roll',8.00,'{vegan,vegetarian,dairy-free}',false,true,'restaurant_stated','Rice rolls with avocado and cucumber.','*avocado,*cucumber,rice,sesame'),
   ('Sushi Lane','Chicken katsu curry',13.00,'{dairy-free}',true,false,'ai_inferred','Breaded chicken with mild curry sauce.','*chicken,*rice,bread,egg,carrot'),
   ('Sushi Lane','Edamame and miso',5.50,'{vegan,vegetarian,dairy-free}',true,true,'restaurant_stated','Small warm plate of soy beans and miso.','*tofu,soy sauce'),
   ('Falafel Corner','Falafel wrap',7.00,'{vegan,vegetarian,halal,dairy-free}',true,false,'restaurant_stated','Crispy chickpea falafel in flatbread.','*chickpeas,*bread,sesame,lettuce,tomato'),
   ('Falafel Corner','Falafel salad box',8.00,'{vegan,vegetarian,halal,gluten-free,dairy-free}',false,true,'restaurant_stated','Falafel on salad, no bread.','*chickpeas,*lettuce,cucumber,tomato,lemon'),
   ('Falafel Corner','Halloumi wrap',8.50,'{vegetarian,halal}',true,false,'ai_inferred','Grilled halloumi cheese in flatbread.','*cheese,*bread,lettuce,tomato'),
   ('Falafel Corner','Hummus and warm pitta',5.50,'{vegan,vegetarian,halal,dairy-free}',true,true,'restaurant_stated','Chickpea dip with warm bread.','*chickpeas,*bread,sesame,lemon,garlic'),
   ('Thai Garden','Green curry with tofu',11.00,'{vegan,vegetarian,gluten-free,dairy-free}',true,false,'ai_inferred','Coconut green curry with tofu and rice.','*tofu,*coconut milk,rice,chilli,basil'),
   ('Thai Garden','Tom yum soup',8.00,'{gluten-free,dairy-free}',true,true,'ai_inferred','Hot and sour soup with prawns.','*prawns,*mushroom,chilli,lemon,ginger'),
   ('Thai Garden','Chicken cashew stir-fry',12.00,'{dairy-free}',true,false,'restaurant_stated','Chicken stir-fried with cashews and soy.','*chicken,*cashews,soy sauce,pepper,rice'),
   ('Thai Garden','Thai rice salad',9.00,'{vegan,vegetarian,gluten-free,dairy-free}',false,true,'ai_inferred','Cool rice salad with herbs and lime.','*rice,*cucumber,carrot,basil,chilli'),
   ('The Baked Potato','Jacket potato with beans',6.00,'{vegan,vegetarian,halal,dairy-free}',true,false,'verified','Baked potato with beans in tomato sauce.','*potato,*tomato,onion'),
   ('The Baked Potato','Jacket potato with cheese',6.50,'{vegetarian,gluten-free}',true,false,'verified','Baked potato with melted cheese.','*potato,*cheese,butter'),
   ('The Baked Potato','Jacket potato with tuna-free chickpea mayo',7.00,'{vegetarian,gluten-free}',true,false,'restaurant_stated','Baked potato with chickpea and egg mayo.','*potato,*chickpeas,egg,mustard'),
   ('The Baked Potato','Roast vegetable soup',5.00,'{vegan,vegetarian,halal,gluten-free,dairy-free}',true,true,'verified','Light soup of roasted vegetables.','*carrot,*pepper,onion,potato')
  ) AS t(rname,name,price,tags,warm,light,conf,summary,ings) LOOP
    SELECT id INTO rid FROM restaurants WHERE name = r.rname;
    INSERT INTO menu_items(restaurant_id,name,price,diet_tags,warm,light,allergen_confidence,summary_text,audio_summary_text)
      VALUES (rid,r.name,r.price,r.tags,r.warm,r.light,r.conf,r.summary,r.summary) RETURNING id INTO iid;
    FOREACH ing IN ARRAY string_to_array(r.ings, ',') LOOP
      k := left(ing,1) = '*'; n := ltrim(ing,'*');
      INSERT INTO menu_item_ingredients(item_id,ingredient_id,is_key) SELECT iid, id, k FROM ingredients WHERE name = n ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
