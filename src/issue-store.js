import _ from 'underscore';
import {EventEmitter} from 'events';
import Client from './github-client';
import {fetchAll, contains, KANBAN_LABEL, ICEBOX_NAME} from './helpers';

const RELOAD_TIME = 60 * 1000;

const toIssueListKey = (repoOwner, repoName) => {
  return repoOwner + '/' + repoName + '/issues';
};
const toIssueKey = (repoOwner, repoName, issueNumber) => {
  return repoOwner + '/' + repoName + '/issues/' + issueNumber;
};

export function filterCards(cards, labels) {
  let filtered = cards;
  // Curry the fn so it is not declared inside a loop
  const filterFn = (label) => (card) => {
    const containsLabel = contains(card.issue.labels, (cardLabel) => {
      return cardLabel.name === label.name;
    });
    if (containsLabel) {
      return true;
    } else if (ICEBOX_NAME === label.name) {
      // If the issue does not match any list then add it to the backlog
      for (const l of card.issue.labels) {
        if (KANBAN_LABEL.test(l.name)) {
          return false;
        }
      }
      // no list labels, so include it in the backlog
      return true;
    }
  };
  for (const i in labels) {
    const label = labels[i];
    filtered = _.filter(filtered, filterFn(label));
    if (filtered.length === 0) {
      return [];
    }
  }
  return filtered;
}

let cacheCards = null;
let cacheIssues = {};
let cacheLastViewed = {};
const initialTimestamp = new Date();

class IssueStore extends EventEmitter {
  off() { // EventEmitter has `.on` but no matching `.off`
    const slice = [].slice;
    const args = arguments.length >= 1 ? slice.call(arguments, 0) : [];
    return this.removeListener.apply(this, args);
  }
  fetchPullRequest(repoOwner, repoName, issueNumber) {
    const issue = Client.getOcto().repos(repoOwner, repoName).pulls(issueNumber);
    return issue.fetch();
  }
  fetchAllIssues(repoOwner, repoNames, isForced) {
    // Start/keep polling
    if (!this.polling) {
      this.polling = setTimeout(() => {
        this.polling = null;
        this.fetchAllIssues(repoOwner, repoNames, true /*isForced*/);
      }, RELOAD_TIME);
    }
    if (!isForced && cacheCards) {
      console.log('potential re-render bug. Occurs when filtering');
      return Promise.resolve(cacheCards);
    }
    const allPromises = _.map(repoNames, (repoName) => {
      const issues = Client.getOcto().repos(repoOwner, repoName).issues.fetch;
      return fetchAll(issues)
      .then((vals) => {
        return _.map(vals, (issue) => {
          return {repoOwner, repoName, issue};
        });
      });
    });
    return Promise.all(allPromises).then((issues) => {
      const cards = _.flatten(issues, true /*shallow*/);
      cacheCards = cards;
      return cards;
    })
  }
  move(repoOwner, repoName, issueNumber, newLabel) {
    // Find all the labels, remove the kanbanLabel, and add the new label
    const key = toIssueKey(repoOwner, repoName, issueNumber);
    const listKey = toIssueListKey(repoOwner, repoName);
    const issue = cacheIssues[key];
    // Exclude Kanban labels
    const labels = _.filter(issue.labels, (label) => {
      if (ICEBOX_NAME === label.name || KANBAN_LABEL.test(label.name)) {
        return false;
      }
      return true;
    });
    const labelNames = _.map(labels);
    // When moving back to icebox do not add a new label
    if (ICEBOX_NAME !== newLabel.name) {
      labelNames.push(newLabel.name);
    }

    return Client.getOcto().repos(repoOwner, repoName).issues(issueNumber).update({labels: labelNames})
    .then(() => {

      this.setLastViewed(repoOwner, repoName, issueNumber);

      // invalidate the issues list
      delete cacheIssues[listKey];
      this.emit('change');
      this.emit('change:' + key);
      this.emit('change:' + listKey);
    });
  }
  createLabel(repoOwner, repoName, opts) {
    return Client.getOcto().repos(repoOwner, repoName).labels.create(opts);
  }
  setLastViewed(repoOwner, repoName, issueNumber) {
    const issueKey = toIssueKey(repoOwner, repoName, issueNumber);
    const now = new Date();
    const isNew = !cacheLastViewed[issueKey] || (now.getTime() - cacheLastViewed[issueKey].getTime() > 10000);
    cacheLastViewed[issueKey] = now;
    if (isNew) {
      this.emit('change:' + issueKey);
    }
  }
  getLastViewed(repoOwner, repoName, issueNumber) {
    const issueKey = toIssueKey(repoOwner, repoName, issueNumber);
    return cacheLastViewed[issueKey] || initialTimestamp;
  }
}

const Store = new IssueStore();
export {toIssueKey, toIssueListKey, Store};
