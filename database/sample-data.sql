-- Optional fake data for local development. Do NOT load this on the live database.
-- Covers every state in the workflow so each admin tab has something to show.

INSERT INTO listings
  (status, submitter_first_name, submitter_last_name, business_name, email, phone, address,
   description, website, links, submitted_at, reviewed_at, last_verified_at)
VALUES
  ('approved', 'Jordan', 'Rivera', 'Peachtree Bookkeeping', 'hello@peachtreebooks.example', '404-555-0101',
   '123 Peachtree St NE, Atlanta, GA', 'Bookkeeping and payroll for small businesses and nonprofits.',
   'https://peachtreebooks.example', 'https://instagram.com/peachtreebooks',
   NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 29 DAY, NOW() - INTERVAL 29 DAY),

  ('approved', 'Sam', 'Okafor', 'Midtown Mobile Detailing', 'book@midtowndetail.example', '678-555-0102',
   NULL, 'Mobile car detailing anywhere inside the perimeter.',
   'https://midtowndetail.example', NULL,
   NOW() - INTERVAL 130 DAY, NOW() - INTERVAL 120 DAY, NOW() - INTERVAL 120 DAY),

  ('pending', 'Taylor', 'Nguyen', 'Taylor Nguyen Photography', 'taylor.nguyen@mail.example', '770-555-0103',
   NULL, 'Portraits and event photography. Ask for Taylor!',
   'https://tnphoto.example', NULL,
   NOW() - INTERVAL 2 DAY, NULL, NULL),

  ('pending', 'Chris', 'Patel', 'Southside Tutoring', 'info@southsidetutoring.example', NULL,
   'College Park, GA', 'Math and reading tutoring for grades 3-12.',
   NULL, 'https://facebook.com/southsidetutoring',
   NOW() - INTERVAL 1 DAY, NULL, NULL),

  ('denied', 'Alex', 'Kim', 'Get Rich Quick LLC', 'money@example.com', NULL,
   NULL, 'Unrelated spam submission.', NULL, NULL,
   NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 9 DAY, NULL);

INSERT INTO reports (listing_id, reason, created_at)
VALUES (1, 'Phone number goes to voicemail that says the business has moved.', NOW() - INTERVAL 3 DAY);
