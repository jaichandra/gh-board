import React from 'react';
import Client from '../github-client';
import * as BS from 'react-bootstrap';

export default React.createClass({
  displayName: 'Login',
  onSave() {
    const {token} = this.refs;
    let tokenVal = token.getValue();
    if (tokenVal) {
      // needs trimming because just copying the token
      // from GitHub (by double-clicking the string instead of
      // clicking the Copy button) adds a leading space character
      tokenVal = tokenVal.trim();
    }
    Client.setToken(tokenVal);
    // Close the modal
    this.onCancel();
  },
  onClear() {
    Client.setToken(null);
    // Re-render the modal
    this.setState({});
  },
  onCancel() {
    this.props.onHide();
  },
  render() {
    const {token} = Client.getCredentials();

    const footer = (
      <span>
        <BS.Button bsStyle='primary' onClick={this.onSave}>Save</BS.Button>
        <BS.Button bsStyle='default' onClick={this.onClear}>Clear</BS.Button>
        <BS.Button bsStyle='default' onClick={this.onCancel}>Cancel</BS.Button>
      </span>
    );

    return (
      <BS.Modal {...this.props}>
        <BS.Modal.Header closeButton>
          <BS.Modal.Title>GitHub Credentials</BS.Modal.Title>
        </BS.Modal.Header>
        <BS.Modal.Body className='modal-body'>
          <BS.Input
            type='text'
            defaultValue={token}
            disabled={!!token}
            placeholder='Enter GitHub token'
            ref='token'
          />
          <div className='github-token-instructions'>
            <h4>"Why do I need a token?"</h4>
            <p>Unlinke other issue trackers, this one runs <em>in your browser</em> via any <a href='https://pages.github.com' target='_blank'>static webserver{' '}<i className='octicon octicon-link-external'/></a> so secret application keys are not possible.</p>
            <h4>"OK, That's fair. How do I create a token?"</h4>
            <ol>
              <li>Go to <a href='https://git1.affinnova.com/settings/tokens/new' target='_blank'>https://git1.affinnova.com/settings/tokens/new{' '}<i className='octicon octicon-link-external'/></a></li>
              <li>Provide a descriptive title (like "gh-board") in the "Token Description"</li>
              <li>Unselect all the checkboxes to just look at public repositories</li>
                <ul>
                  <li>Select <code>public_repo</code> to be able to update/move issues</li>
                  <li>Select <code>repo</code> if you want to see/update information for <strong>private</strong> repositories</li>
                </ul>
              <li>Click <code>Generate Token</code></li>
              <li>Copy the new token and paste it in here!</li>
              <li><strong>Note:</strong> You may need to refresh the page when you click "Save"</li>
            </ol>
            <h4>"GitHub Enterprise Endpoint"</h4>
            <p>
              You need to set a custom <code>rootURL</code>?. Set the following in your browser console:<br/>
              <pre>window.localStorage.setItem('gh-rootURL', 'https://github.example.com/api/v3')</pre>
            </p>
          </div>
        </BS.Modal.Body>
        <BS.Modal.Footer className='modal-footer'>
          {footer}
        </BS.Modal.Footer>
    </BS.Modal>
    );
  }
});
