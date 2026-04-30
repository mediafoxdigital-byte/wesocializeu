const paragraphs = (...items) => items.map((item) => `<p>${item}</p>`).join('');

const stepBlocks = (items) => items.map((item) => `
  <div class="service-step">
    <h3>${item.title}</h3>
    ${item.description ? `<p>${item.description}</p>` : ''}
  </div>
`).join('');

const list = (items) => `
  <ul>
    ${items.map((item) => `<li>${item}</li>`).join('')}
  </ul>
`;

module.exports = [
  {
    slug: 'influencer-marketing',
    filename: 'influencer-marketing.html',
    icon: '🔥',
    title: 'Influencer Marketing',
    hero_title: 'Influencer Marketing That Actually Drives Results',
    hero_subheading: "We don't just collaborate with creators—we build influencer-led systems that drive awareness, trust, and conversions at scale.",
    what_we_do: paragraphs(
      "Influencer marketing today is more than just reach—it's about relevance, storytelling, and performance.",
      'We manage the entire lifecycle of influencer campaigns, from identifying the right creators to delivering measurable outcomes.',
      'Our approach combines data, platform understanding, and creator insight to ensure every campaign feels authentic and performs effectively.',
      'We work across categories—macro influencers, micro creators, and niche communities—to match your brand with the right voices.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Creator Discovery & Mapping', description: 'We identify creators based on audience relevance, engagement quality, and brand fit—not just follower count.' },
      { title: '2. Strategy & Campaign Design', description: 'We define the role of influencers within your overall marketing ecosystem.' },
      { title: '3. Outreach & Negotiation', description: 'We manage communication, contracts, and deliverables seamlessly.' },
      { title: '4. Content Direction & Execution', description: 'We guide creators while preserving their authenticity.' },
      { title: '5. Amplification & Distribution', description: 'We extend reach through paid media and platform optimization.' },
      { title: '6. Performance Tracking', description: 'We measure engagement, reach, conversions, and ROI with detailed reporting.' }
    ]),
    what_makes_us_different: paragraphs(
      'We think beyond one-off campaigns—focusing on long-term creator ecosystems.',
      'We balance creativity with performance metrics.',
      'We integrate influencer marketing into your overall growth strategy.'
    ),
    sort_order: 1
  },
  {
    slug: 'content-video-production',
    filename: 'content-video-production.html',
    icon: '🎥',
    title: 'Content & Video Production',
    hero_title: 'Content That Captures Attention—and Keeps It',
    hero_subheading: 'We create high-impact content built for how people actually consume today.',
    what_we_do: paragraphs(
      'Content is the foundation of modern marketing.',
      'We produce high-quality, platform-first content that drives engagement, builds brand identity, and supports performance campaigns.',
      'From short-form videos to large-scale productions, we handle everything—from idea to final output.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Concept & Ideation', description: 'We develop ideas aligned with your brand and audience behavior.' },
      { title: '2. Scripting & Pre-Production', description: 'Clear storytelling frameworks, planning, and shoot preparation.' },
      { title: '3. Production', description: 'High-quality shoots tailored to platform needs.' },
      { title: '4. Post-Production', description: 'Editing, sound, motion graphics, and platform optimization.' },
      { title: '5. Content Distribution Ready', description: 'Content designed to perform across social and paid channels.' }
    ]),
    what_makes_us_different: paragraphs(
      'Platform-first thinking, not generic content.',
      'Ability to scale content production.',
      'Strong integration with influencer and performance teams.'
    ),
    sort_order: 2
  },
  {
    slug: 'campaign-management',
    filename: 'campaign-management.html',
    icon: '🚀',
    title: 'Campaign Management',
    hero_title: 'Campaigns That Work as One System',
    hero_subheading: "We don't run campaigns in silos—we build integrated systems that deliver results.",
    what_we_do: paragraphs(
      'We manage campaigns end-to-end—strategy, execution, and optimization.',
      'Our focus is on ensuring every element works together to achieve a unified goal.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Strategy & Planning', description: 'Define objectives, messaging, and channel mix.' },
      { title: '2. Execution Across Channels', description: 'Digital, influencer, social, and on-ground.' },
      { title: '3. Real-Time Monitoring', description: 'Track performance continuously.' },
      { title: '4. Optimization', description: 'Adapt quickly based on insights.' }
    ]),
    what_makes_us_different: paragraphs(
      '360° campaign thinking.',
      'Strong coordination across teams.',
      'Focus on measurable outcomes.'
    ),
    use_cases: '',
    sort_order: 3
  },
  {
    slug: 'social-media-management',
    filename: 'social-media-management.html',
    icon: '📱',
    title: 'Social Media Management',
    hero_title: 'More Than Content. We Build Communities.',
    hero_subheading: 'We manage your entire social presence—from strategy to execution.',
    what_we_do: paragraphs(
      'We manage your entire social presence—from strategy to execution—ensuring your brand stays relevant, engaging, and consistent.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Content Strategy', description: 'Platform-specific planning aligned with your goals.' },
      { title: '2. Content Creation', description: 'High-quality, engaging content across formats.' },
      { title: '3. Publishing & Optimization', description: 'Timing, consistency, and performance tracking.' },
      { title: '4. Community Management', description: 'Active engagement with your audience.' }
    ]),
    what_makes_us_different: paragraphs(
      'Focus on engagement, not just posting.',
      'Deep understanding of platform algorithms.',
      'Integration with influencer and content teams.'
    ),
    use_cases: '',
    sort_order: 4
  },
  {
    slug: 'performance-marketing',
    filename: 'performance-marketing.html',
    icon: '📈',
    title: 'Performance Marketing',
    hero_title: 'Performance Marketing That Drives Real Business Growth',
    hero_subheading: 'Data-driven campaigns focused on conversions, leads, and ROI—not just impressions.',
    what_we_do: paragraphs(
      'We run data-driven campaigns focused on conversions, leads, and ROI—not just impressions.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Audience Targeting', description: 'Precise segmentation and targeting.' },
      { title: '2. Creative Testing', description: 'Multiple variations to identify winners.' },
      { title: '3. Campaign Optimization', description: 'Continuous improvements for better performance.' },
      { title: '4. Analytics & Reporting', description: 'Clear insights into ROI and growth.' }
    ]),
    what_makes_us_different: paragraphs(
      'Strong creative and performance integration.',
      'Continuous testing approach.',
      'Focus on business outcomes.'
    ),
    
    sort_order: 5
  },
  {
    slug: 'events-experiences',
    filename: 'events-experiences.html',
    icon: '🎤',
    title: 'Events & Experiences',
    hero_title: 'Experiences That People Remember—and Share',
    hero_subheading: 'We create immersive brand experiences that drive real-world engagement.',
    what_we_do: paragraphs(
      'We create immersive brand experiences—from events to activations—that drive real-world engagement.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Concept', description: 'Unique experience ideation aligned to brand.' },
      { title: '2. Planning', description: 'End-to-end logistics and coordination.' },
      { title: '3. Production', description: 'Bringing the experience to life.' },
      { title: '4. Execution', description: 'On-ground management and delivery.' },
      { title: '5. Amplification', description: 'Extending reach through content and media.' }
    ]),
    what_makes_us_different: paragraphs(
      'Strong execution capability.',
      'Integration with content and media.',
      'Experience in large-scale events.'
    ),
    use_cases: '',
    sort_order: 6
  },
  {
    slug: 'public-relations',
    filename: 'public-relations.html',
    icon: '🎤',
    title: 'Public Relations (PR)',
    hero_title: 'Build Perception. Build Credibility. Build Trust.',
    hero_subheading: 'Shape and amplify your narrative through strategic media outreach and storytelling.',
    what_we_do: paragraphs(
      "Public perception can define a brand's success.",
      'We help shape and amplify your narrative through strategic media outreach and storytelling.',
      'From press coverage to thought leadership, we ensure your brand shows up in the right conversations, with the right message, at the right time.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Narrative Development', description: 'We define your brand story and key messaging.' },
      { title: '2. Media Mapping', description: 'Identify relevant publications, journalists, and platforms.' },
      { title: '3. Outreach & Placements', description: 'Press releases, interviews, features, and editorial coverage.' },
      { title: '4. Reputation Management', description: 'Monitoring and managing brand perception proactively.' }
    ]),
    what_makes_us_different: paragraphs(
      'Strong storytelling approach, not just press distribution.',
      'Focus on relevance, not just volume of coverage.',
      'Integrated with campaigns and launches.'
    ),
    sort_order: 7
  },
  {
    slug: 'creator-management',
    filename: 'creator-management.html',
    icon: '👥',
    title: 'Creator Management',
    hero_title: 'Building Creators Into Long-Term Assets',
    hero_subheading: 'We manage and grow creators by connecting them with the right opportunities.',
    what_we_do: paragraphs(
      'We manage and grow creators by connecting them with the right opportunities and helping them build sustainable careers.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Onboarding & Positioning', description: 'Defining creator identity and niche.' },
      { title: '2. Brand Partnerships', description: 'Connecting creators with relevant brands.' },
      { title: '3. Growth Strategy', description: 'Content and platform growth planning.' },
      { title: '4. Long-Term Management', description: 'Building sustainable creator careers.' }
    ]),
    what_makes_us_different: paragraphs(
      'Deep understanding of creator ecosystems.',
      'Strong brand-creator matchmaking.',
      'Long-term approach, not transactional.'
    ),
    use_cases: '',
    sort_order: 8
  },
  {
    slug: 'ugc-user-generated-content',
    filename: 'ugc-user-generated-content.html',
    icon: '📲',
    title: 'UGC (User Generated Content)',
    hero_title: 'Authentic Content That Audiences Trust',
    hero_subheading: 'Scalable content pipelines using real users and communities.',
    what_we_do: paragraphs(
      'We create scalable content pipelines using real users and communities, making your brand more relatable and trustworthy.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Campaign Design', description: 'Structuring UGC initiatives.' },
      { title: '2. Creator/Consumer Sourcing', description: 'Identifying participants.' },
      { title: '3. Content Guidelines', description: 'Ensuring quality and consistency.' },
      { title: '4. Amplification', description: 'Scaling content through paid and organic channels.' }
    ]),
    what_makes_us_different: paragraphs(
      'High authenticity and relatability.',
      'Cost-effective content scaling.',
      'Strong performance integration.'
    ),
    use_cases: '',
    sort_order: 9
  },
  {
    slug: 'community-building',
    filename: 'community-building.html',
    icon: '💬',
    title: 'Community Building',
    hero_title: 'From Audience to Loyal Community',
    hero_subheading: 'We help brands build engaged communities that drive long-term loyalty and advocacy.',
    what_we_do: paragraphs(
      'We help brands build engaged communities that drive long-term loyalty, retention, and advocacy.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Platform Setup', description: 'Discord, WhatsApp, social platforms.' },
      { title: '2. Engagement Strategy', description: 'Content and interaction planning.' },
      { title: '3. Moderation & Management', description: 'Active participation and response.' },
      { title: '4. Growth Initiatives', description: 'Campaigns to expand and engage communities.' }
    ]),
    what_makes_us_different: paragraphs(
      'Focus on long-term relationships.',
      'Engagement-driven approach.',
      'Integration with content and campaigns.'
    ),
    use_cases: '',
    sort_order: 10
  },
  {
    slug: 'sports-entertainment-marketing',
    filename: 'sports-entertainment-marketing.html',
    icon: '🏏',
    title: 'Sports & Entertainment Marketing',
    hero_title: 'Built for Culture, Not Just Campaigns',
    hero_subheading: 'Specialized marketing for sports leagues, tournaments, and entertainment properties.',
    what_we_do: paragraphs(
      'We specialize in marketing sports leagues, tournaments, and entertainment properties—driving fan engagement and large-scale visibility.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Fan Engagement Strategies', description: 'Content and experiences.' },
      { title: '2. Sponsorship Integration', description: 'Brand collaborations within properties.' },
      { title: '3. Content & Distribution', description: 'Scaling reach across platforms.' }
    ]),
    what_makes_us_different: paragraphs(
      'Deep understanding of sports and entertainment culture.',
      'Strong network across properties and platforms.',
      'Ability to drive both fan engagement and brand value.'
    ),
    use_cases: '',
    sort_order: 11
  },
  {
    slug: 'ip-development-management',
    filename: 'ip-development-management.html',
    icon: '🎬',
    title: 'IP Development & Management',
    hero_title: "Don't Just Advertise on Culture. Build It.",
    hero_subheading: 'We create, develop, and scale original intellectual properties that audiences engage with over time.',
    what_we_do: paragraphs(
      'We create, develop, and scale original intellectual properties—formats, shows, leagues, and content ecosystems—that audiences engage with over time.',
      'In a world where attention is fragmented, owning IP gives brands a long-term advantage.',
      'Instead of renting attention through ads, we help you build platforms where audiences choose to engage.',
      'From concept to monetization, we manage the entire lifecycle—turning ideas into scalable, revenue-generating assets.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Concept & Format Development', description: 'We identify white spaces and build unique, scalable concepts tailored to audience behavior.' },
      { title: '2. Audience & Platform Strategy', description: 'Defining where the IP lives and how it grows—digital, on-ground, or hybrid.' },
      { title: '3. Content & Production', description: 'Building consistent, high-quality content pipelines to sustain engagement.' },
      { title: '4. Partnerships & Sponsorships', description: 'Bringing in brands and collaborators to monetize the IP effectively.' },
      { title: '5. Distribution & Growth', description: 'Scaling reach through content, creators, and media amplification.' }
    ]),
    what_makes_us_different: paragraphs(
      'Strong understanding of creator-led and content-first ecosystems.',
      'Ability to integrate brands organically within IPs.',
      'Focus on long-term scalability, not one-time launches.'
    ),
    sort_order: 12
  },
  {
    slug: 'sponsorship-brand-partnerships',
    filename: 'sponsorship-brand-partnerships.html',
    icon: '🤝',
    title: 'Sponsorship & Brand Partnerships',
    hero_title: "The Right Partnerships Don't Just Add Visibility. They Add Value.",
    hero_subheading: 'Strategic partnerships between brands, creators, platforms, and properties.',
    what_we_do: paragraphs(
      'We create and facilitate strategic partnerships between brands, creators, platforms, and properties.',
      "The goal is not just exposure—it's alignment.",
      'We ensure every collaboration delivers value across visibility, engagement, and brand perception.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Opportunity Mapping', description: 'Identifying the right platforms, creators, or IPs for your brand.' },
      { title: '2. Strategic Fit & Alignment', description: 'Ensuring brand values, audience, and objectives match.' },
      { title: '3. Deal Structuring & Negotiation', description: 'Creating win-win partnerships for all stakeholders.' },
      { title: '4. Execution & Integration', description: 'Seamlessly embedding brands into content, campaigns, or experiences.' },
      { title: '5. Performance Tracking', description: 'Measuring impact across reach, engagement, and brand lift.' }
    ]),
    what_makes_us_different: paragraphs(
      'Focus on meaningful, long-term partnerships.',
      'Strong network across creators, platforms, and properties.',
      'Deep integration with campaigns and content ecosystems.'
    ),
    sort_order: 13
  },
  {
    slug: 'crisis-management-reputation-control',
    filename: 'crisis-management-reputation-control.html',
    icon: '🛡️',
    title: 'Crisis Management & Reputation Control',
    hero_title: 'When Things Go Wrong, Strategy Matters More Than Speed',
    hero_subheading: 'Navigate high-risk situations with clarity, control, and strategic communication.',
    what_we_do: paragraphs(
      'We help brands navigate high-risk and sensitive situations with clarity, control, and strategic communication.',
      'In moments of crisis, every message matters.',
      "We ensure your response is timely, measured, and aligned with your brand's long-term reputation."
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Crisis Assessment', description: 'Understanding the situation, risks, and potential impact.' },
      { title: '2. Response Strategy', description: 'Crafting clear, consistent messaging across channels.' },
      { title: '3. Stakeholder Communication', description: 'Managing communication with media, audiences, and internal teams.' },
      { title: '4. Real-Time Monitoring', description: 'Tracking sentiment and evolving narratives.' },
      { title: '5. Reputation Recovery', description: 'Rebuilding trust post-crisis through strategic actions and communication.' }
    ]),
    what_makes_us_different: paragraphs(
      'Calm, structured approach in high-pressure situations.',
      'Balance between transparency and brand protection.',
      'Integration with PR and communication strategies.'
    ),
    sort_order: 14
  },
  {
    slug: 'e-commerce-marketplace-management',
    filename: 'e-commerce-marketplace-management.html',
    icon: '🛒',
    title: 'E-Commerce & Marketplace Management',
    hero_title: 'Visibility is Easy. Conversions Are What Matter.',
    hero_subheading: "Manage and optimize your brand's presence across e-commerce and marketplace platforms.",
    what_we_do: paragraphs(
      "We manage and optimize your brand's presence across e-commerce and marketplace platforms, ensuring consistent growth in visibility, conversions, and revenue.",
      'From product listings to performance campaigns, we ensure every touchpoint drives purchase decisions.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Platform Setup & Optimization', description: 'Creating and optimizing listings for discoverability and conversions.' },
      { title: '2. Content & Creative Optimization', description: 'High-quality visuals, descriptions, and A+ content.' },
      { title: '3. Performance Campaigns', description: 'Running ads within marketplaces to boost visibility and sales.' },
      { title: '4. Pricing & Competitor Tracking', description: 'Ensuring competitive positioning.' },
      { title: '5. Analytics & Conversion Optimization', description: 'Tracking performance and improving key metrics.' }
    ]),
    what_makes_us_different: paragraphs(
      'Strong focus on conversion, not just traffic.',
      'Integration with performance marketing and content.',
      'Continuous optimization approach.'
    ),
    sort_order: 15
  },
  {
    slug: 'email-crm-marketing',
    filename: 'email-crm-marketing.html',
    icon: '📧',
    title: 'Email & CRM Marketing',
    hero_title: "Growth Doesn't End at Acquisition",
    hero_subheading: 'Customer communication systems that improve retention, engagement, and lifetime value.',
    what_we_do: paragraphs(
      'We design and implement customer communication systems that improve retention, engagement, and lifetime value.',
      'While most brands focus on acquiring users, we help you build relationships that last.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Customer Journey Mapping', description: 'Understanding user lifecycle and touchpoints.' },
      { title: '2. Automation & Workflows', description: 'Setting up email and CRM journeys (welcome, retention, reactivation).' },
      { title: '3. Personalization', description: 'Segmenting audiences for targeted communication.' },
      { title: '4. Content & Messaging', description: 'Crafting relevant, value-driven communication.' },
      { title: '5. Performance Tracking', description: 'Optimizing open rates, click rates, and conversions.' }
    ]),
    what_makes_us_different: paragraphs(
      'Focus on long-term customer value.',
      'Strong integration with performance and product data.',
      'Personalized, data-driven communication.'
    ),
    sort_order: 16
  },
  {
    slug: 'localization-regional-marketing',
    filename: 'localization-regional-marketing.html',
    icon: '🌍',
    title: 'Localization & Regional Marketing',
    hero_title: "One Message Doesn't Fit Every Market",
    hero_subheading: 'Adapt your brand communication for different regions, languages, and cultural contexts.',
    what_we_do: paragraphs(
      'We adapt your brand communication for different regions, languages, and cultural contexts—ensuring deeper relevance and stronger engagement.',
      'India and global markets are diverse.',
      'We help you speak to each audience in a way that feels natural, not translated.'
    ),
    how_we_do_it: stepBlocks([
      { title: '1. Market & Audience Understanding', description: 'Identifying regional behaviors, preferences, and cultural nuances.' },
      { title: '2. Language & Content Adaptation', description: 'Translating and localizing messaging effectively.' },
      { title: '3. Regional Creator & Media Integration', description: 'Leveraging local influencers and platforms.' },
      { title: '4. Campaign Customization', description: 'Adapting campaigns for different regions.' },
      { title: '5. Performance Tracking', description: 'Measuring effectiveness across markets.' }
    ]),
    what_makes_us_different: paragraphs(
      'Cultural-first approach, not just language translation.',
      'Strong regional creator network.',
      'Ability to scale campaigns across diverse markets.'
    ),
    sort_order: 17
  }
];
