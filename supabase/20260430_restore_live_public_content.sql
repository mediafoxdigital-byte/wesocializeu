-- Restore live Supabase public content and public read policies.
-- Use this for the existing project if public pages return empty data from Supabase.

begin;

grant usage on schema public to anon, authenticated;
grant select on public.ugc_videos, public.creators, public.blogs, public.case_studies, public.service_pages to anon, authenticated;
grant insert on public.leads, public.creator_leads to anon, authenticated;
grant usage, select on sequence public.leads_id_seq to anon, authenticated;
grant usage, select on sequence public.creator_leads_id_seq to anon, authenticated;

drop policy if exists "public leads insert" on public.leads;
create policy "public leads insert"
on public.leads for insert to anon
with check (
  status = 'new'
  and created_at >= now() - interval '5 minutes'
  and created_at <= now() + interval '5 minutes'
  and name is not null
  and char_length(btrim(name)) between 2 and 120
  and email is not null
  and char_length(email) <= 254
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]{2,}$'
  and (
    phone is null
    or phone = ''
    or phone ~ '^[+]?[0-9]{10,15}$'
  )
  and char_length(coalesce(service, '')) <= 200
  and char_length(coalesce(message, '')) <= 2000
  and char_length(coalesce(company, '')) <= 160
  and (
    coalesce(website, '') = ''
    or (
      char_length(website) <= 500
      and website ~* '^https?://[^[:space:]@/]+[.][^[:space:]]+$'
    )
  )
);

drop policy if exists "public creator leads insert" on public.creator_leads;
create policy "public creator leads insert"
on public.creator_leads for insert to anon
with check (
  created_at >= now() - interval '5 minutes'
  and created_at <= now() + interval '5 minutes'
  and name is not null
  and char_length(btrim(name)) between 2 and 120
  and email is not null
  and char_length(email) <= 254
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]{2,}$'
  and phone is not null
  and phone ~ '^[+]?[0-9]{10,15}$'
  and char_length(coalesce(dob, '')) <= 30
  and char_length(coalesce(gender, '')) <= 30
  and char_length(coalesce(pincode, '')) <= 20
  and category is not null
  and char_length(btrim(category)) between 2 and 80
  and char_length(coalesce(language, '')) <= 80
  and has_instagram in ('Yes', 'No')
  and has_youtube in ('Yes', 'No')
  and (
    has_instagram = 'Yes'
    or has_youtube = 'Yes'
  )
  and (
    (
      has_instagram = 'Yes'
      and char_length(coalesce(instagram_url, '')) <= 500
      and instagram_url ~* '^https?://([^/?#@]+[.])?instagram[.]com([/:?#].*)?$'
    )
    or (
      has_instagram = 'No'
      and coalesce(instagram_url, '') = ''
    )
  )
  and (
    (
      has_youtube = 'Yes'
      and char_length(coalesce(youtube_url, '')) <= 500
      and youtube_url ~* '^https?://([^/?#@]+[.])?(youtube[.]com|youtu[.]be)([/:?#].*)?$'
    )
    or (
      has_youtube = 'No'
      and coalesce(youtube_url, '') = ''
    )
  )
);

drop policy if exists "public videos select" on public.ugc_videos;
create policy "public videos select"
on public.ugc_videos for select to anon, authenticated
using (true);

drop policy if exists "public creators select" on public.creators;
create policy "public creators select"
on public.creators for select to anon, authenticated
using (true);

drop policy if exists "public blogs select" on public.blogs;
create policy "public blogs select"
on public.blogs for select to anon, authenticated
using (true);

drop policy if exists "public case studies select" on public.case_studies;
create policy "public case studies select"
on public.case_studies for select to anon, authenticated
using (true);

drop policy if exists "public active service pages select" on public.service_pages;
create policy "public active service pages select"
on public.service_pages for select to anon, authenticated
using (is_active = 1);

insert into public.creator_categories (name)
values ('Top Creators'), ('Rising Stars'), ('Micro Influencers')
on conflict (name) do nothing;

insert into public.creator_platforms (name)
values ('Instagram'), ('YouTube'), ('TikTok'), ('Twitter/X')
on conflict (name) do nothing;

insert into public.service_pages (id, slug, title, icon, hero_title, hero_subheading, hero_gallery_images, how_image_url, what_heading, how_heading, how_subtitle, diff_heading, diff_subtitle, use_cases_subtitle, faq_subtitle, cta_subtitle, what_we_do, how_we_do_it, how_steps_json, what_makes_us_different, use_cases_title, use_cases, cta, sort_order, is_active, is_customized, created_at)
values
  (1, 'influencer-marketing', 'Influencer Marketing', '🔥', 'Influencer Marketing That Actually Drives Results', 'We don''t just collaborate with creators—we build influencer-led systems that drive awareness, trust, and conversions at scale.', '[]', '/uploads/1777055951907-d7e4c6da-dc72-431b-8eff-a6156a7188a6.png', '', '', '', '', '', '', '', '', '<p>Influencer marketing today is more than just reach—it''s about relevance, storytelling, and performance.</p><p>We manage the entire lifecycle of influencer campaigns, from identifying the right creators to delivering measurable outcomes.</p><p>Our approach combines data, platform understanding, and creator insight to ensure every campaign feels authentic and performs effectively.</p><p>We work across categories—macro influencers, micro creators, and niche communities—to match your brand with the right voices.</p>', '<div class="service-step">
  <h3>1. Creator Discovery &amp; Mapping</h3>
  <p>We identify creators based on audience relevance, engagement quality, and brand fit—not just follower count.</p>
  <img src="/uploads/1777055951907-d7e4c6da-dc72-431b-8eff-a6156a7188a6.png" alt="1. Creator Discovery &amp; Mapping image" loading="lazy">
</div>
<div class="service-step">
  <h3>2. Strategy &amp; Campaign Design</h3>
  <p>We define the role of influencers within your overall marketing ecosystem.</p>
  <img src="/uploads/1777095144481-ebd415af-260d-4cad-a6b6-fa0880232ebe.png" alt="2. Strategy &amp; Campaign Design image" loading="lazy">
</div>
<div class="service-step">
  <h3>3. Outreach &amp; Negotiation</h3>
  <p>We manage communication, contracts, and deliverables seamlessly.</p>
  <img src="/uploads/1777095163280-e70d0b24-47f7-4998-91b8-33efc17e0509.png" alt="3. Outreach &amp; Negotiation image" loading="lazy">
</div>
<div class="service-step">
  <h3>4. Content Direction &amp; Execution</h3>
  <p>We guide creators while preserving their authenticity.</p>
  <img src="/uploads/1777095168324-542ded5a-6488-423c-b1b5-cb9342957e23.png" alt="4. Content Direction &amp; Execution image" loading="lazy">
</div>
<div class="service-step">
  <h3>5. Amplification &amp; Distribution</h3>
  <p>We extend reach through paid media and platform optimization.</p>
  <img src="/uploads/1777095174481-39c8f966-f749-45eb-a286-17cac442273e.png" alt="5. Amplification &amp; Distribution image" loading="lazy">
</div>
<div class="service-step">
  <h3>6. Performance Tracking</h3>
  <p>We measure engagement, reach, conversions, and ROI with detailed reporting.</p>
  <img src="/uploads/1777095179402-07b91cda-1adf-46e8-bc33-ca793a88d7b7.png" alt="6. Performance Tracking image" loading="lazy">
</div>', '[]', '<p>We think beyond one-off campaigns—focusing on long-term creator ecosystems.</p><p>We balance creativity with performance metrics.</p><p>We integrate influencer marketing into your overall growth strategy.</p>', '', '', '', 1, 1, 1, '2026-04-21 10:56:00'),
  (2, 'content-video-production', 'Content & Video Production', '🎥', 'Content That Captures Attention—and Keeps It', 'We create high-impact content built for how people actually consume today.', '["/uploads/1777054702524-5d5e8211-85b2-4de3-a2e8-e19b73bffaa8.png","/uploads/1777054707099-49ec126b-2d5d-48d8-bb30-ff68c20f509e.png","/uploads/1777054712742-9f25e803-b321-488a-80a6-8f9cedf10f40.png","/uploads/1777060255709-060f709e-ae5f-4eb0-a6e1-345e55a9defe.png","/uploads/1777060259810-1aa3fc7b-630c-42c0-b938-5551f09607ff.png"]', '/uploads/1777054667594-8382f2d4-25e0-47fe-9a9f-c441738d1a6b.jpg', '', '', '', '', '', '', '', '', '<p>Content is the foundation of modern marketing.</p><p>We produce high-quality, platform-first content that drives engagement, builds brand identity, and supports performance campaigns.</p><p>From short-form videos to large-scale productions, we handle everything—from idea to final output.</p>', '<div class="service-step">
  <h3>1. Concept &amp; Ideation</h3>
  <p>We develop ideas aligned with your brand and audience behavior.</p>
  <img src="/uploads/1777054667594-8382f2d4-25e0-47fe-9a9f-c441738d1a6b.jpg" alt="1. Concept &amp; Ideation image" loading="lazy">
</div>
<div class="service-step">
  <h3>2. Scripting &amp; Pre-Production</h3>
  <p>Clear storytelling frameworks, planning, and shoot preparation.</p>
  <img src="/uploads/1777095251900-d31f3891-ebf5-44d4-bfbe-5c9cb887aa1a.png" alt="2. Scripting &amp; Pre-Production image" loading="lazy">
</div>
<div class="service-step">
  <h3>3. Production</h3>
  <p>High-quality shoots tailored to platform needs.</p>
</div>
<div class="service-step">
  <h3>4. Post-Production</h3>
  <p>Editing, sound, motion graphics, and platform optimization.</p>
</div>
<div class="service-step">
  <h3>5. Content Distribution Ready</h3>
  <p>Content designed to perform across social and paid channels.</p>
</div>', '[]', '<p>Platform-first thinking, not generic content.</p><p>Ability to scale content production.</p><p>Strong integration with influencer and performance teams.</p><p><br></p>', 'Use Cases', '<ul>
    <li>Social media content</li><li>Ad creatives</li><li>Brand films</li><li>Event and live content</li>
  </ul>', 'Create Content That Actually Performs', 2, 1, 1, '2026-04-21 10:56:00'),
  (3, 'campaign-management', 'Campaign Management', '🚀', 'Campaigns That Work as One System', 'We don''t run campaigns in silos—we build integrated systems that deliver results.', '[]', '', '', '', '', '', '', '', '', '', '<p>We manage campaigns end-to-end—strategy, execution, and optimization.</p><p>Our focus is on ensuring every element works together to achieve a unified goal.</p>', '
  <div class="service-step">
    <h3>1. Strategy & Planning</h3>
    <p>Define objectives, messaging, and channel mix.</p>
  </div>

  <div class="service-step">
    <h3>2. Execution Across Channels</h3>
    <p>Digital, influencer, social, and on-ground.</p>
  </div>

  <div class="service-step">
    <h3>3. Real-Time Monitoring</h3>
    <p>Track performance continuously.</p>
  </div>

  <div class="service-step">
    <h3>4. Optimization</h3>
    <p>Adapt quickly based on insights.</p>
  </div>
', '[]', '<p>360° campaign thinking.</p><p>Strong coordination across teams.</p><p>Focus on measurable outcomes.</p>', '', '', '', 3, 1, 0, '2026-04-21 10:56:00'),
  (4, 'social-media-management', 'Social Media Management', '📱', 'More Than Content. We Build Communities.', 'We manage your entire social presence—from strategy to execution.', '[]', '', '', '', '', '', '', '', '', '', '<p>We manage your entire social presence—from strategy to execution—ensuring your brand stays relevant, engaging, and consistent.</p>', '
  <div class="service-step">
    <h3>1. Content Strategy</h3>
    <p>Platform-specific planning aligned with your goals.</p>
  </div>

  <div class="service-step">
    <h3>2. Content Creation</h3>
    <p>High-quality, engaging content across formats.</p>
  </div>

  <div class="service-step">
    <h3>3. Publishing & Optimization</h3>
    <p>Timing, consistency, and performance tracking.</p>
  </div>

  <div class="service-step">
    <h3>4. Community Management</h3>
    <p>Active engagement with your audience.</p>
  </div>
', '[]', '<p>Focus on engagement, not just posting.</p><p>Deep understanding of platform algorithms.</p><p>Integration with influencer and content teams.</p>', '', '', '', 4, 1, 0, '2026-04-21 10:56:00'),
  (5, 'performance-marketing', 'Performance Marketing', '📈', 'Performance Marketing That Drives Real Business Growth', 'Data-driven campaigns focused on conversions, leads, and ROI—not just impressions.', '[]', '', '', '', '', '', '', '', '', '', '<p>We run data-driven campaigns focused on conversions, leads, and ROI—not just impressions.</p>', '
  <div class="service-step">
    <h3>1. Audience Targeting</h3>
    <p>Precise segmentation and targeting.</p>
  </div>

  <div class="service-step">
    <h3>2. Creative Testing</h3>
    <p>Multiple variations to identify winners.</p>
  </div>

  <div class="service-step">
    <h3>3. Campaign Optimization</h3>
    <p>Continuous improvements for better performance.</p>
  </div>

  <div class="service-step">
    <h3>4. Analytics & Reporting</h3>
    <p>Clear insights into ROI and growth.</p>
  </div>
', '[]', '<p>Strong creative and performance integration.</p><p>Continuous testing approach.</p><p>Focus on business outcomes.</p>', '', '', '', 5, 1, 0, '2026-04-21 10:56:00'),
  (6, 'events-experiences', 'Events & Experiences', '🎤', 'Experiences That People Remember—and Share', 'We create immersive brand experiences that drive real-world engagement.', '[]', '', '', '', '', '', '', '', '', '', '<p>We create immersive brand experiences—from events to activations—that drive real-world engagement.</p>', '
  <div class="service-step">
    <h3>1. Concept</h3>
    <p>Unique experience ideation aligned to brand.</p>
  </div>

  <div class="service-step">
    <h3>2. Planning</h3>
    <p>End-to-end logistics and coordination.</p>
  </div>

  <div class="service-step">
    <h3>3. Production</h3>
    <p>Bringing the experience to life.</p>
  </div>

  <div class="service-step">
    <h3>4. Execution</h3>
    <p>On-ground management and delivery.</p>
  </div>

  <div class="service-step">
    <h3>5. Amplification</h3>
    <p>Extending reach through content and media.</p>
  </div>
', '[]', '<p>Strong execution capability.</p><p>Integration with content and media.</p><p>Experience in large-scale events.</p>', '', '', '', 6, 1, 0, '2026-04-21 10:56:00'),
  (7, 'public-relations', 'Public Relations (PR)', '🎤', 'Build Perception. Build Credibility. Build Trust.', 'Shape and amplify your narrative through strategic media outreach and storytelling.', '[]', '', '', '', '', '', '', '', '', '', '<p>Public perception can define a brand''s success.</p><p>We help shape and amplify your narrative through strategic media outreach and storytelling.</p><p>From press coverage to thought leadership, we ensure your brand shows up in the right conversations, with the right message, at the right time.</p>', '
  <div class="service-step">
    <h3>1. Narrative Development</h3>
    <p>We define your brand story and key messaging.</p>
  </div>

  <div class="service-step">
    <h3>2. Media Mapping</h3>
    <p>Identify relevant publications, journalists, and platforms.</p>
  </div>

  <div class="service-step">
    <h3>3. Outreach & Placements</h3>
    <p>Press releases, interviews, features, and editorial coverage.</p>
  </div>

  <div class="service-step">
    <h3>4. Reputation Management</h3>
    <p>Monitoring and managing brand perception proactively.</p>
  </div>
', '[]', '<p>Strong storytelling approach, not just press distribution.</p><p>Focus on relevance, not just volume of coverage.</p><p>Integrated with campaigns and launches.</p>', '', '', '', 7, 1, 0, '2026-04-21 10:56:00'),
  (8, 'creator-management', 'Creator Management', '👥', 'Building Creators Into Long-Term Assets', 'We manage and grow creators by connecting them with the right opportunities.', '[]', '', '', '', '', '', '', '', '', '', '<p>We manage and grow creators by connecting them with the right opportunities and helping them build sustainable careers.</p>', '
  <div class="service-step">
    <h3>1. Onboarding & Positioning</h3>
    <p>Defining creator identity and niche.</p>
  </div>

  <div class="service-step">
    <h3>2. Brand Partnerships</h3>
    <p>Connecting creators with relevant brands.</p>
  </div>

  <div class="service-step">
    <h3>3. Growth Strategy</h3>
    <p>Content and platform growth planning.</p>
  </div>

  <div class="service-step">
    <h3>4. Long-Term Management</h3>
    <p>Building sustainable creator careers.</p>
  </div>
', '[]', '<p>Deep understanding of creator ecosystems.</p><p>Strong brand-creator matchmaking.</p><p>Long-term approach, not transactional.</p>', '', '', '', 8, 1, 0, '2026-04-21 10:56:00'),
  (9, 'ugc-user-generated-content', 'UGC (User Generated Content)', '📲', 'Authentic Content That Audiences Trust', 'Scalable content pipelines using real users and communities.', '[]', '', '', '', '', '', '', '', '', '', '<p>We create scalable content pipelines using real users and communities, making your brand more relatable and trustworthy.</p>', '
  <div class="service-step">
    <h3>1. Campaign Design</h3>
    <p>Structuring UGC initiatives.</p>
  </div>

  <div class="service-step">
    <h3>2. Creator/Consumer Sourcing</h3>
    <p>Identifying participants.</p>
  </div>

  <div class="service-step">
    <h3>3. Content Guidelines</h3>
    <p>Ensuring quality and consistency.</p>
  </div>

  <div class="service-step">
    <h3>4. Amplification</h3>
    <p>Scaling content through paid and organic channels.</p>
  </div>
', '[]', '<p>High authenticity and relatability.</p><p>Cost-effective content scaling.</p><p>Strong performance integration.</p>', '', '', '', 9, 1, 0, '2026-04-21 10:56:00'),
  (10, 'community-building', 'Community Building', '💬', 'From Audience to Loyal Community', 'We help brands build engaged communities that drive long-term loyalty and advocacy.', '[]', '', '', '', '', '', '', '', '', '', '<p>We help brands build engaged communities that drive long-term loyalty, retention, and advocacy.</p>', '
  <div class="service-step">
    <h3>1. Platform Setup</h3>
    <p>Discord, WhatsApp, social platforms.</p>
  </div>

  <div class="service-step">
    <h3>2. Engagement Strategy</h3>
    <p>Content and interaction planning.</p>
  </div>

  <div class="service-step">
    <h3>3. Moderation & Management</h3>
    <p>Active participation and response.</p>
  </div>

  <div class="service-step">
    <h3>4. Growth Initiatives</h3>
    <p>Campaigns to expand and engage communities.</p>
  </div>
', '[]', '<p>Focus on long-term relationships.</p><p>Engagement-driven approach.</p><p>Integration with content and campaigns.</p>', '', '', '', 10, 1, 0, '2026-04-21 10:56:00'),
  (11, 'sports-entertainment-marketing', 'Sports & Entertainment Marketing', '🏏', 'Built for Culture, Not Just Campaigns', 'Specialized marketing for sports leagues, tournaments, and entertainment properties.', '[]', '', '', '', '', '', '', '', '', '', '<p>We specialize in marketing sports leagues, tournaments, and entertainment properties—driving fan engagement and large-scale visibility.</p>', '
  <div class="service-step">
    <h3>1. Fan Engagement Strategies</h3>
    <p>Content and experiences.</p>
  </div>

  <div class="service-step">
    <h3>2. Sponsorship Integration</h3>
    <p>Brand collaborations within properties.</p>
  </div>

  <div class="service-step">
    <h3>3. Content & Distribution</h3>
    <p>Scaling reach across platforms.</p>
  </div>
', '[]', '<p>Deep understanding of sports and entertainment culture.</p><p>Strong network across properties and platforms.</p><p>Ability to drive both fan engagement and brand value.</p>', '', '', '', 11, 1, 0, '2026-04-21 10:56:00'),
  (12, 'ip-development-management', 'IP Development & Management', '🎬', 'Don''t Just Advertise on Culture. Build It.', 'We create, develop, and scale original intellectual properties that audiences engage with over time.', '[]', '', '', '', '', '', '', '', '', '', '<p>We create, develop, and scale original intellectual properties—formats, shows, leagues, and content ecosystems—that audiences engage with over time.</p><p>In a world where attention is fragmented, owning IP gives brands a long-term advantage.</p><p>Instead of renting attention through ads, we help you build platforms where audiences choose to engage.</p><p>From concept to monetization, we manage the entire lifecycle—turning ideas into scalable, revenue-generating assets.</p>', '
  <div class="service-step">
    <h3>1. Concept & Format Development</h3>
    <p>We identify white spaces and build unique, scalable concepts tailored to audience behavior.</p>
  </div>

  <div class="service-step">
    <h3>2. Audience & Platform Strategy</h3>
    <p>Defining where the IP lives and how it grows—digital, on-ground, or hybrid.</p>
  </div>

  <div class="service-step">
    <h3>3. Content & Production</h3>
    <p>Building consistent, high-quality content pipelines to sustain engagement.</p>
  </div>

  <div class="service-step">
    <h3>4. Partnerships & Sponsorships</h3>
    <p>Bringing in brands and collaborators to monetize the IP effectively.</p>
  </div>

  <div class="service-step">
    <h3>5. Distribution & Growth</h3>
    <p>Scaling reach through content, creators, and media amplification.</p>
  </div>
', '[]', '<p>Strong understanding of creator-led and content-first ecosystems.</p><p>Ability to integrate brands organically within IPs.</p><p>Focus on long-term scalability, not one-time launches.</p>', '', '', '', 12, 1, 0, '2026-04-21 10:56:00'),
  (13, 'sponsorship-brand-partnerships', 'Sponsorship & Brand Partnerships', '🤝', 'The Right Partnerships Don''t Just Add Visibility. They Add Value.', 'Strategic partnerships between brands, creators, platforms, and properties.', '[]', '', '', '', '', '', '', '', '', '', '<p>We create and facilitate strategic partnerships between brands, creators, platforms, and properties.</p><p>The goal is not just exposure—it''s alignment.</p><p>We ensure every collaboration delivers value across visibility, engagement, and brand perception.</p>', '
  <div class="service-step">
    <h3>1. Opportunity Mapping</h3>
    <p>Identifying the right platforms, creators, or IPs for your brand.</p>
  </div>

  <div class="service-step">
    <h3>2. Strategic Fit & Alignment</h3>
    <p>Ensuring brand values, audience, and objectives match.</p>
  </div>

  <div class="service-step">
    <h3>3. Deal Structuring & Negotiation</h3>
    <p>Creating win-win partnerships for all stakeholders.</p>
  </div>

  <div class="service-step">
    <h3>4. Execution & Integration</h3>
    <p>Seamlessly embedding brands into content, campaigns, or experiences.</p>
  </div>

  <div class="service-step">
    <h3>5. Performance Tracking</h3>
    <p>Measuring impact across reach, engagement, and brand lift.</p>
  </div>
', '[]', '<p>Focus on meaningful, long-term partnerships.</p><p>Strong network across creators, platforms, and properties.</p><p>Deep integration with campaigns and content ecosystems.</p>', '', '', '', 13, 1, 0, '2026-04-21 10:56:00'),
  (14, 'crisis-management-reputation-control', 'Crisis Management & Reputation Control', '🛡️', 'When Things Go Wrong, Strategy Matters More Than Speed', 'Navigate high-risk situations with clarity, control, and strategic communication.', '[]', '', '', '', '', '', '', '', '', '', '<p>We help brands navigate high-risk and sensitive situations with clarity, control, and strategic communication.</p><p>In moments of crisis, every message matters.</p><p>We ensure your response is timely, measured, and aligned with your brand''s long-term reputation.</p>', '
  <div class="service-step">
    <h3>1. Crisis Assessment</h3>
    <p>Understanding the situation, risks, and potential impact.</p>
  </div>

  <div class="service-step">
    <h3>2. Response Strategy</h3>
    <p>Crafting clear, consistent messaging across channels.</p>
  </div>

  <div class="service-step">
    <h3>3. Stakeholder Communication</h3>
    <p>Managing communication with media, audiences, and internal teams.</p>
  </div>

  <div class="service-step">
    <h3>4. Real-Time Monitoring</h3>
    <p>Tracking sentiment and evolving narratives.</p>
  </div>

  <div class="service-step">
    <h3>5. Reputation Recovery</h3>
    <p>Rebuilding trust post-crisis through strategic actions and communication.</p>
  </div>
', '[]', '<p>Calm, structured approach in high-pressure situations.</p><p>Balance between transparency and brand protection.</p><p>Integration with PR and communication strategies.</p>', '', '', '', 14, 1, 0, '2026-04-21 10:56:00'),
  (15, 'e-commerce-marketplace-management', 'E-Commerce & Marketplace Management', '🛒', 'Visibility is Easy. Conversions Are What Matter.', 'Manage and optimize your brand''s presence across e-commerce and marketplace platforms.', '[]', '', '', '', '', '', '', '', '', '', '<p>We manage and optimize your brand''s presence across e-commerce and marketplace platforms, ensuring consistent growth in visibility, conversions, and revenue.</p><p>From product listings to performance campaigns, we ensure every touchpoint drives purchase decisions.</p>', '
  <div class="service-step">
    <h3>1. Platform Setup & Optimization</h3>
    <p>Creating and optimizing listings for discoverability and conversions.</p>
  </div>

  <div class="service-step">
    <h3>2. Content & Creative Optimization</h3>
    <p>High-quality visuals, descriptions, and A+ content.</p>
  </div>

  <div class="service-step">
    <h3>3. Performance Campaigns</h3>
    <p>Running ads within marketplaces to boost visibility and sales.</p>
  </div>

  <div class="service-step">
    <h3>4. Pricing & Competitor Tracking</h3>
    <p>Ensuring competitive positioning.</p>
  </div>

  <div class="service-step">
    <h3>5. Analytics & Conversion Optimization</h3>
    <p>Tracking performance and improving key metrics.</p>
  </div>
', '[]', '<p>Strong focus on conversion, not just traffic.</p><p>Integration with performance marketing and content.</p><p>Continuous optimization approach.</p>', '', '', '', 15, 1, 0, '2026-04-21 10:56:00'),
  (16, 'email-crm-marketing', 'Email & CRM Marketing', '📧', 'Growth Doesn''t End at Acquisition', 'Customer communication systems that improve retention, engagement, and lifetime value.', '[]', '', '', '', '', '', '', '', '', '', '<p>We design and implement customer communication systems that improve retention, engagement, and lifetime value.</p><p>While most brands focus on acquiring users, we help you build relationships that last.</p>', '
  <div class="service-step">
    <h3>1. Customer Journey Mapping</h3>
    <p>Understanding user lifecycle and touchpoints.</p>
  </div>

  <div class="service-step">
    <h3>2. Automation & Workflows</h3>
    <p>Setting up email and CRM journeys (welcome, retention, reactivation).</p>
  </div>

  <div class="service-step">
    <h3>3. Personalization</h3>
    <p>Segmenting audiences for targeted communication.</p>
  </div>

  <div class="service-step">
    <h3>4. Content & Messaging</h3>
    <p>Crafting relevant, value-driven communication.</p>
  </div>

  <div class="service-step">
    <h3>5. Performance Tracking</h3>
    <p>Optimizing open rates, click rates, and conversions.</p>
  </div>
', '[]', '<p>Focus on long-term customer value.</p><p>Strong integration with performance and product data.</p><p>Personalized, data-driven communication.</p>', '', '', '', 16, 1, 0, '2026-04-21 10:56:00'),
  (17, 'localization-regional-marketing', 'Localization & Regional Marketing', '🌍', 'One Message Doesn''t Fit Every Market', 'Adapt your brand communication for different regions, languages, and cultural contexts.', '[]', '', '', '', '', '', '', '', '', '', '<p>We adapt your brand communication for different regions, languages, and cultural contexts—ensuring deeper relevance and stronger engagement.</p><p>India and global markets are diverse.</p><p>We help you speak to each audience in a way that feels natural, not translated.</p>', '
  <div class="service-step">
    <h3>1. Market & Audience Understanding</h3>
    <p>Identifying regional behaviors, preferences, and cultural nuances.</p>
  </div>

  <div class="service-step">
    <h3>2. Language & Content Adaptation</h3>
    <p>Translating and localizing messaging effectively.</p>
  </div>

  <div class="service-step">
    <h3>3. Regional Creator & Media Integration</h3>
    <p>Leveraging local influencers and platforms.</p>
  </div>

  <div class="service-step">
    <h3>4. Campaign Customization</h3>
    <p>Adapting campaigns for different regions.</p>
  </div>

  <div class="service-step">
    <h3>5. Performance Tracking</h3>
    <p>Measuring effectiveness across markets.</p>
  </div>
', '[]', '<p>Cultural-first approach, not just language translation.</p><p>Strong regional creator network.</p><p>Ability to scale campaigns across diverse markets.</p>', '', '', '', 17, 1, 0, '2026-04-21 10:56:00')
on conflict (slug) do update set
  title = excluded.title,
  icon = excluded.icon,
  hero_title = excluded.hero_title,
  hero_subheading = excluded.hero_subheading,
  hero_gallery_images = excluded.hero_gallery_images,
  how_image_url = excluded.how_image_url,
  what_heading = excluded.what_heading,
  how_heading = excluded.how_heading,
  how_subtitle = excluded.how_subtitle,
  diff_heading = excluded.diff_heading,
  diff_subtitle = excluded.diff_subtitle,
  use_cases_subtitle = excluded.use_cases_subtitle,
  faq_subtitle = excluded.faq_subtitle,
  cta_subtitle = excluded.cta_subtitle,
  what_we_do = excluded.what_we_do,
  how_we_do_it = excluded.how_we_do_it,
  how_steps_json = excluded.how_steps_json,
  what_makes_us_different = excluded.what_makes_us_different,
  use_cases_title = excluded.use_cases_title,
  use_cases = excluded.use_cases,
  cta = excluded.cta,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  is_customized = excluded.is_customized,
  created_at = excluded.created_at;

select setval(pg_get_serial_sequence('public.service_pages', 'id'), greatest(coalesce((select max(id) from public.service_pages), 1), 1), true);

insert into public.blogs (id, title, image_url, excerpt, body, link_url, date_text, is_featured, order_idx, created_at)
values
  (1, 'The 2026 Blueprint for Social Commerce Dominance', 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=900&q=80', 'How India top brands are building an influencer ecosystem that converts attention into sales.', 'Online marketing has changed quietly but completely.

A few years ago, being online was enough. A website, a few ads, social media presence — that was considered progress. Today, every brand has those basics covered. Visibility is no longer rare. Attention is.

Consumers scroll faster, skip quicker, and forget brands just as easily as they discover them. In this environment, online marketing is no longer about volume. It’s about meaning.

This is where My Haul Store (MHS) approaches online marketing differently — not as a checklist of channels, but as a system that helps brands stay relevant, recognizable, and trusted over time.

The Real Problem With Modern Online Marketing

Most brands don’t struggle with effort. They struggle with direction.

Content gets posted because it’s “time to post.” Ads get launched because budgets need to be spent. Campaigns go live without a clear reason for existing. Over time, this creates noise — activity without progress.

The issue isn’t lack of marketing. It’s lack of cohesion.

Online marketing fails when each channel works in isolation. Search says one thing. Social says another. Ads promise something the website doesn’t reinforce. Customers notice this disconnect immediately, even if they can’t articulate it.

MHS starts by fixing alignment — because no tactic performs well without clarity.

Online Marketing Starts With Understanding Human Behavior

People don’t behave logically online. They behave emotionally.

They don’t buy because they saw one ad. They buy because something made sense after multiple touchpoints. They explore, compare, hesitate, revisit, and then decide.

Effective online marketing respects this journey.

At MHS, strategies are built around how people actually consume content — not how dashboards present data. This means focusing on indications of relevance, stability, and trust instead of chasing transient traffic surges.

 Platform-focused marketing is constantly outperformed by people-focused marketing.

Content That Serves a Purpose 

Content is everywhere. Useful content is rare.

Most brands create content hoping the algorithm will reward them. The result is safe, predictable posts that blend into the feed. They may get views, but they don’t build memory.

Content is viewed by MHS as a brand asset rather than a filler. Every piece of content addresses a question, offers a solution, or bolsters a brand''s stance. Because it is perceived by viewers as being produced for them rather than for outreach, content with intent naturally performs better.

This approach builds familiarity. Familiarity builds trust. And trust drives action.

Paid Marketing Without Losing Brand Identity

Although they are effective, paid advertisements have the potential to weaken a brand if used improperly.

Messaging frequently becomes oversimplified when performance measures take precedence. Clicks increase, but brand value decreases. Over time, this attracts the wrong audience and weakens positioning.

MHS balances performance with perception.

Campaigns are designed to attract attention and set the right expectations. This leads to better-quality traffic, stronger engagement, and customers who stay longer — not just click once.

Good online marketing doesn’t just bring people in. It brings the right people in.

Data Matters — But Context Matters More

Dashboards are full of numbers. Not all of them are useful.

High impressions don’t always mean high interest. Clicks don’t always mean intent. Engagement doesn’t always translate to growth.

MHS focuses on data that reflects behavior, not vanity. How users move through a website. Where they pause. What they revisit. When they leave.

These patterns reveal far more than surface-level metrics and allow strategies to evolve intelligently instead of reactively.

Scaling Online Marketing Without Breaking Consistency

Growth often breaks brands.

As marketing scales, messaging becomes diluted. Visuals lose consistency. Different teams communicate differently. Customers feel the shift before businesses do.

MHS helps brands scale with structure. Systems are put in place so growth doesn’t compromise clarity. Whether a brand is running one campaign or ten, the experience feels unified.

Consistency isn’t restrictive — it’s reassuring. And reassurance builds confidence.

Why Long-Term Thinking Wins Online

Short-term wins feel good. Long-term relevance builds businesses.

Brands that look beyond the next campaign are rewarded by online marketing. Over time, those that make investments in identity, tone, and trust see a compounding effect.

MHS partners with brands that want sustainability, not shortcuts. The focus is on creating a digital presence that grows stronger with every interaction rather than resetting every month.

That’s how online marketing becomes an advantage instead of an expense.

Conclusion

Online marketing today is not about doing more. It’s about doing things with intention.

Brands that succeed are not louder — they’re clearer. They understand their audience, respect attention, and communicate with consistency.

My Haul Store helps brands move away from scattered efforts and toward meaningful digital growth. By aligning strategy, content, and performance, MHS ensures online marketing works as a system — not a guessing game.

In a digital world full of noise, the brands that win are the ones people remember.

Tags
#online marketing strategy #digital brand building #my haul store #online growth #performance marketing #digital presence #brand visibility', '', 'Apr 10, 2026', 0, 2, '2026-04-13 18:37:48'),
  (2, 'Why Perfect Content is Killing Your Engagement', 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80', '', '', '', 'Apr 5, 2026', 0, 6, '2026-04-13 18:37:48'),
  (3, 'Vetting Creators Beyond the Follower Count', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80', '', '', '', 'Mar 28, 2026', 0, 5, '2026-04-13 18:37:48'),
  (4, 'Decoding the 2026 Instagram Feed Algorithm', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80', 'How attention duration is replacing engagement rate as the primary algorithm metric.', '', '', 'Mar 20, 2026', 0, 4, '2026-04-13 18:37:48'),
  (5, 'Scaling Outreach Without Losing Authenticity', 'https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=600&q=80', 'AI tools we use to personalize communication for 1000+ creators at scale.', '', '', 'Mar 15, 2026', 0, 3, '2026-04-13 18:37:48'),
  (6, 'Anatomy of a 50M View Viral Video Campaign', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&q=80', 'The hook, the transition, and the CTA that drove record-breaking sales.', '', '', 'Mar 10, 2026', 0, 1, '2026-04-13 18:37:48')
on conflict (id) do update set
  title = excluded.title,
  image_url = excluded.image_url,
  excerpt = excluded.excerpt,
  body = excluded.body,
  link_url = excluded.link_url,
  date_text = excluded.date_text,
  is_featured = excluded.is_featured,
  order_idx = excluded.order_idx,
  created_at = excluded.created_at;

select setval(pg_get_serial_sequence('public.blogs', 'id'), greatest(coalesce((select max(id) from public.blogs), 1), 1), true);

insert into public.case_studies (id, title, image_url, link_url, excerpt, body, is_wide, order_idx, created_at)
values
  (1, 'Managing 500+ Influencers for Amazon Great Indian Festival', 'https://images.unsplash.com/photo-1607082352121-fa243f3dde32?w=700&q=80', '', '', '', 0, 4, '2026-04-13 18:37:26'),
  (2, 'Making Virat Kohli Birthday a Viral Sensation', 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=700&q=80', '', 'summary', 'text&nbsp;', 0, 3, '2026-04-13 18:37:26'),
  (3, 'India #1 Fashion Influencer Strategy for Social Commerce', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=80', '', '', '', 0, 1, '2026-04-13 18:37:27'),
  (4, '3x Sales Growth Through Micro-Influencer Ecosystem', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80', '', '', '', 0, 5, '2026-04-13 18:37:27'),
  (5, '36 Million Views for Beach India Campaign', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&q=80', '', '', '', 0, 2, '2026-04-13 18:37:27')
on conflict (id) do update set
  title = excluded.title,
  image_url = excluded.image_url,
  link_url = excluded.link_url,
  excerpt = excluded.excerpt,
  body = excluded.body,
  is_wide = excluded.is_wide,
  order_idx = excluded.order_idx,
  created_at = excluded.created_at;

select setval(pg_get_serial_sequence('public.case_studies', 'id'), greatest(coalesce((select max(id) from public.case_studies), 1), 1), true);

insert into public.creators (id, name, category, platform, followers, image_url, profile_url, created_at)
values
  (1, 'hamid', 'Top Creators', 'Instagram', '15M', '/uploads/ig-profile-1777116209746-6d106c46-a3f8-4ed0-ba5a-a7274bd2d765.jpg', 'https://www.instagram.com/_.rehman._noorani', '2026-04-13 15:22:09'),
  (2, 'Abdul', 'Rising Stars', 'YouTube', '15M', 'https://avatars.githubusercontent.com/u/193277234?v=4?s=400', 'https://github.com/HamidNoorani04', '2026-04-13 17:57:16'),
  (4, 'nikhil', 'Top Creators', 'Instagram', '15M', '/uploads/ig-profile-1777455563717-b030cf41-4f53-42c2-8ed7-cfeba9db3c1b.jpg', 'https://www.instagram.com/nikhilandchill', '2026-04-29 09:39:27')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  platform = excluded.platform,
  followers = excluded.followers,
  image_url = excluded.image_url,
  profile_url = excluded.profile_url,
  created_at = excluded.created_at;

select setval(pg_get_serial_sequence('public.creators', 'id'), greatest(coalesce((select max(id) from public.creators), 1), 1), true);

insert into public.ugc_videos (id, badge, thumbnail_url, video_url, title, category, likes_count, comments_count, visit_url, created_at)
values
  (1, '', '/uploads/1777111580433-bb474ea2-ce72-4fdb-91c8-d47c1d638f33.png', '/uploads/1777115676117-24a6d3f0-d655-4d84-bc32-cd1800d0907a.mp4', 'test video', 'UGC Videos', 0, 0, '', '2026-04-25 10:05:09'),
  (2, '', '/uploads/1777111957002-784811ad-cf33-4320-a89e-ac75db0f8025.png', '', '2', 'test category', 0, 0, '', '2026-04-25 10:12:27'),
  (7, '', '/uploads/1777113065736-53c3f036-505b-4426-8835-d2286e03a770.png', '', 'test', 'UGC', 0, 0, '', '2026-04-25 10:31:06')
on conflict (id) do update set
  badge = excluded.badge,
  thumbnail_url = excluded.thumbnail_url,
  video_url = excluded.video_url,
  title = excluded.title,
  category = excluded.category,
  likes_count = excluded.likes_count,
  comments_count = excluded.comments_count,
  visit_url = excluded.visit_url,
  created_at = excluded.created_at;

select setval(pg_get_serial_sequence('public.ugc_videos', 'id'), greatest(coalesce((select max(id) from public.ugc_videos), 1), 1), true);

commit;
