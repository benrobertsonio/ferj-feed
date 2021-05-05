#!/usr/bin/env node
const RSSParser = require('rss-parser');
const WPAPI = require('wpapi');
require('dotenv').config({
  path: '.env',
});

const daysAgo = 1;

// Discover WP endpoints.
const wpConnect = WPAPI.discover({
  endpoint: process.env.SITE_URL,
  username: process.env.WP_USER,
  password: process.env.PW
});

const parser = new RSSParser();

// Return a feed.
const getFeed = async (url) => {
  try {
    return await parser.parseURL(url);
  } catch (e) {
    console.error(e.stack);
  }
}

const getJobs = (feed, site) => {
  const jobs = [];
  // Loop through all feed items.
  feed.items.forEach(({ title, content, link, pubDate, ...rest }) => {

    // Only get jobs posted since x daysAgo.
    const filter = new Date(new Date().setDate(new Date().getDate() - daysAgo));
    if (!(new Date(pubDate) > filter)) {
      return;
    }

    const job = {
      title,
      content,
      company: '',
      date: pubDate,
      url: link
    }

    const isNotFrontEnd = !job.title.toLowerCase().includes('front end')
      && !job.title.toLowerCase().includes('front-end')
      && !job.title.toLowerCase().includes('frontend')
      && !job.title.toLowerCase().includes('ui')
      && !job.title.toLowerCase().includes('ux');

    if (site === 'https://authenticjobs.com/rss/index.xml') {
      const isRemote = rest.contentSnippet.indexOf('(Anywhere)') == 0;
      if (isRemote && !isNotFrontEnd) {
        // Split job title / company.
        if (job.title.toLowerCase().includes(': ')) {
          const [title, company] = job.title.split(': ');
          job.title = title;
          job.company = company.split(' (')[0];
        }
      } else {
        return;
      }
    }

    // Split job title / company.
    if (job.title.toLowerCase().includes(' at ')) {
      const [title, company] = job.title.split(' at ');
      job.title = title;
      job.company = company.split(' (')[0];
    }

    // If site is codepen, only return remote positions.
    if (
      site === 'https://codepen.io/jobs/feed/' &&
      !job.content.includes('Full Time Remote Position')
    ) return;

    // Only get front end positions from We Work Remotely.
    if (
      site === 'https://weworkremotely.com/remote-jobs.rss' ||
      site === 'https://jobs.github.com/positions.atom' ||
      site === 'https://stackoverflow.com/jobs/feed?q="front+end"&r=true'
    ) {
      if (isNotFrontEnd) return;
    }

    jobs.push(job);
  });

  // Sort by date descending.
  jobs.sort((a, b) => {
    a = new Date(a.date);
    b = new Date(b.date);
    return a > b ? -1 : a < b ? 1 : 0;
  });

  return jobs;
}

// Create job post in WordPress.
const createPost = (job) => {
  wpConnect.then((site) =>
    // TODO: Check if post exists before creating a new one.
    wp.jobs().create({
      title: job.title,
      content: job.content,
      fields: {
        apply_url: job.url,
        company: job.company,
      }
    }).then((response) => {
      console.log(response && response.id, job.title, job.company);
    })
  )
}


(() => {

  const FEED_LIST = [
    'https://jobs.github.com/positions.atom',
    'https://codepen.io/jobs/feed/',
    'https://stackoverflow.com/jobs/feed?q="front+end"&r=true', // b=FirstApplicants
    // 'https://remoteok.io/remote-front-end-jobs.rss',
    'https://weworkremotely.com/remote-jobs.rss', // filter by job title?
    'https://authenticjobs.com/rss/index.xml',
  ];

  FEED_LIST.forEach(async (url) => {
    try {
      // Get feed details.
      const feed = await getFeed(url);
      // Get jobs.
      const jobs = await getJobs(feed, url);

      // Print feed name and how many jobs were found.
      console.log(feed.title, jobs.length);

      // For each job, create a new job post.
      jobs.forEach((job) => createPost(job));
    } catch (e) {
      console.error(e.stack);
    }
  });
})();


