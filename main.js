const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const githubURL = [
  'github.githubassets.com',
  'central.github.com',
  'desktop.githubusercontent.com',
  'assets-cdn.github.com',
  'camo.githubusercontent.com',
  'github.map.fastly.net',
  'github.global.ssl.fastly.net',
  'gist.github.com',
  'github.io',
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'user-images.githubusercontent.com',
  'favicons.githubusercontent.com',
  'avatars5.githubusercontent.com',
  'avatars4.githubusercontent.com',
  'avatars3.githubusercontent.com',
  'avatars2.githubusercontent.com',
  'avatars1.githubusercontent.com',
  'avatars0.githubusercontent.com',
  'avatars.githubusercontent.com',
  'codeload.github.com',
  'github-cloud.s3.amazonaws.com',
  'github-com.s3.amazonaws.com',
  'github-production-release-asset-2e65be.s3.amazonaws.com',
  'github-production-user-asset-6210df.s3.amazonaws.com',
  'github-production-repository-file-5c1aeb.s3.amazonaws.com',
  'githubstatus.com',
  'github.community',
  'media.githubusercontent.com'
];

async function findIP(host) {
  const hostBody = host.split(".");
  let url = "";
  
  if (hostBody.length == 2) {
    url = "https://" + host + ".ipaddress.com";
  } else {
    url = "https://" + hostBody[hostBody.length - 2] + "." + hostBody[hostBody.length - 1] + ".ipaddress.com/" + host;
  }
  
  const response = await fetch(url);
  const htmlText = await response.text();

  const $ = cheerio.load(htmlText);
  const IPList = [];

  $("#dnsinfo>tr").each(function () {
    let td = $(this).children();
    if ($(td[1]).text() == "A") {
      IPList.push($(this).children().last().text());
    }
  });

  return IPList;
}

async function findIPWrapper(host) {
  let retryCount = 3;
  let result = "";

  try {
    result = await findIP(host);
  } catch (err) {
    if (retryCount > 1) {
      retryCount--;
      result = await findIP(host);
    } else {
      console.log("[error]: %s is failed", host);
    }
  }

  return result;
}

async function acquireGithubHosts() {
  let hostsContent = "";
  
  for (let index = 0; index < githubURL.length; index++) {
    console.log("[process]: %d/%d %s", index + 1, githubURL.length, githubURL[index]);
    const result = await findIPWrapper(githubURL[index]);
    if (result && result.length) {
      let hostContent = result[0] + Array(30 - result[0].length).join(' ');
      hostsContent += hostContent + githubURL[index] + "\n";
    }
  }

  try {
    const updateTime = dayjs().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
    const readmeTemplate = "# hosts-js\nhost-js is a concise version of [hosts](https://github.com/ineo6/hosts)\n## hosts\nupdate at: {update_time}\n```shell\n{host_content}```\n## license\n[MIT](LICENSE)";
    let content = readmeTemplate.replace('{host_content}', hostsContent).replace('{update_time}', updateTime);
    const readmePath = path.join('./', 'README.md');
    fs.writeFileSync(readmePath, content);
  } catch (err) {
    console.log("[error]: %s", err.message);
  }
}

async function main() {
  await acquireGithubHosts();
}

main();
