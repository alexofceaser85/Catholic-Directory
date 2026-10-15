-- Optional fake data for local development. Do NOT load this on the live database.
-- Covers every state in the workflow so each admin tab has something to show.
-- None of these rows has a manage link; use "Email me my links" on /manage with a row's
-- email to get one (it prints in the server log while MAIL_HOST is empty).

INSERT INTO listings
  (status, post_type, category, submitter_first_name, submitter_last_name, title, email, phone, address,
   description, website, links, submitted_at, reviewed_at, last_verified_at, expires_on)
VALUES
  -- 1: live business, verified recently
  ('approved', 'business', 'Farm & livestock', 'Jordan', 'Rivera', 'Sweetwater Creek Farm',
   'hello@sweetwatercreek.example', '770-555-0101', 'Douglasville, GA',
   'Pasture-raised eggs, chicken and seasonal vegetables. Farm pickup on Saturdays.',
   'https://sweetwatercreek.example', 'https://instagram.com/sweetwatercreek',
   NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 29 DAY, NOW() - INTERVAL 29 DAY, NULL),

  -- 2: live business, due for reverification (120 days)
  ('approved', 'business', 'Crafts & handmade', 'Sam', 'Okafor', 'St. Isidore Woodworks',
   'orders@stisidore.example', NULL, 'Marietta, GA', 'Cutting boards, home altars and furniture.',
   NULL, NULL,
   NOW() - INTERVAL 130 DAY, NOW() - INTERVAL 120 DAY, NOW() - INTERVAL 120 DAY, NULL),

  -- 3: live services post
  ('approved', 'offering_services', 'Trades & construction', 'Chris', 'Patel', 'Fence building and repair',
   'fencing@example.com', '678-555-0110', 'West metro Atlanta',
   'Woven wire, board and electric fence. Gates and corner posts. Free estimates.', NULL, NULL,
   NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 10 DAY, CURRENT_DATE() + INTERVAL 50 DAY),

  -- 4: live help-wanted post
  ('approved', 'help_wanted', 'Farm & livestock', 'Morgan', 'Lee', 'Farmhand for fall harvest, 2 days a week',
   'jobs@sweetwatercreek.example', NULL, 'Douglasville, GA',
   'Picking, washing and packing vegetables, Tuesdays and Fridays through November. Paid hourly.', NULL, NULL,
   NOW() - INTERVAL 4 DAY, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY, CURRENT_DATE() + INTERVAL 27 DAY),

  -- 5: expired help-wanted post (hidden from the public site, shows in the Expired tab)
  ('approved', 'help_wanted', 'Home & garden', 'Riley', 'Brooks', 'Help clearing brush',
   'brush@example.com', NULL, 'Canton, GA', 'Two days of brush clearing in September.', NULL, NULL,
   NOW() - INTERVAL 45 DAY, NOW() - INTERVAL 40 DAY, NOW() - INTERVAL 40 DAY, CURRENT_DATE() - INTERVAL 10 DAY),

  -- 6: pending, with the submitter's name in the title (name warning)
  ('pending', 'offering_services', 'Education & homeschool', 'Taylor', 'Nguyen', 'Taylor Nguyen Tutoring',
   'taylor.nguyen@mail.example', '770-555-0103', NULL, 'Math and reading tutoring for grades 3-12.', NULL, NULL,
   NOW() - INTERVAL 2 DAY, NULL, NULL, NULL),

  -- 7: pending business
  ('pending', 'business', 'Food & produce', 'Casey', 'Morris', 'Little Flower Bakery',
   'orders@littleflower.example', NULL, 'Roswell, GA', 'Sourdough and pastries, Saturdays at the market.', NULL, NULL,
   NOW() - INTERVAL 1 DAY, NULL, NULL, NULL),

  -- 8: denied
  ('denied', 'business', 'Other', 'Alex', 'Kim', 'Get Rich Quick LLC', 'money@example.com', NULL,
   NULL, 'Unrelated spam submission.', NULL, NULL,
   NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 9 DAY, NULL, NULL);

INSERT INTO reports (listing_id, reason, created_at)
VALUES (1, 'Phone number goes to voicemail that says the farm has moved.', NOW() - INTERVAL 3 DAY);

-- A poster asked to change their live help-wanted post (shows in the Edit requests tab).
INSERT INTO listing_edits (listing_id, changes)
VALUES (4, JSON_OBJECT(
  'title', 'Farmhand for fall harvest, 3 days a week',
  'category', 'Farm & livestock',
  'email', 'jobs@sweetwatercreek.example',
  'phone', '770-555-0199',
  'address', 'Douglasville, GA',
  'description', 'Picking, washing and packing vegetables, Tue/Thu/Fri through November. Paid hourly; lunch included.',
  'website', NULL,
  'links', JSON_ARRAY()
));
