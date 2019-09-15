import { A } from '@ember/array';
import { getOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import Ember from 'ember';
import Configuration from './../configuration';
import isFastBoot from 'ember-simple-auth/utils/is-fastboot';

export const applicationRoute = () => target => {
  const NewClass = class extends target.prototype {
    @service session;

    _isFastBoot = isFastBoot();
    routeAfterAuthentication = Configuration.routeAfterAuthentication;

    constructor() {
      super(...arguments);

      this._subscribeToSessionEvents();
    }

    _subscribeToSessionEvents() {
      A([
        ['authenticationSucceeded', 'sessionAuthenticated'],
        ['invalidationSucceeded', 'sessionInvalidated']
      ]).forEach(([event, method]) => {
        this.session.on(event, (...args) => this[method](...args));
      });
    }

    /**
      This method handles the session's
      {{#crossLink "SessionService/authenticationSucceeded:event"}}{{/crossLink}}
      event. If there is a transition that was previously intercepted by the
      {{#crossLink "AuthenticatedRouteMixin/beforeModel:method"}}
      AuthenticatedRouteMixin's `beforeModel` method{{/crossLink}} it will retry
      it. If there is no such transition, the `ember_simple_auth-redirectTarget`
      cookie will be checked for a url that represents an attemptedTransition
      that was aborted in Fastboot mode, otherwise this action transitions to the
      {{#crossLink "Configuration/routeAfterAuthentication:property"}}{{/crossLink}}.

      @method sessionAuthenticated
      @public
    */
    sessionAuthenticated = function sessionAuthenticated() {
      const attemptedTransition = this.session.attemptedTransition;
      const cookies = getOwner(this).lookup('service:cookies');
      const redirectTarget = cookies.read('ember_simple_auth-redirectTarget');

      if (attemptedTransition) {
        attemptedTransition.retry();
        this.session.attemptedTransition = null;
      } else if (redirectTarget) {
        this.transitionTo(redirectTarget);
        cookies.clear('ember_simple_auth-redirectTarget');
      } else {
        this.transitionTo(this.routeAfterAuthentication);
      }
    }

    /**
      This method handles the session's
      {{#crossLink "SessionService/invalidationSucceeded:event"}}{{/crossLink}}
      event. __It reloads the Ember.js application__ by redirecting the browser
      to the application's root URL so that all in-memory data (such as Ember
      Data stores etc.) gets cleared.

      If the Ember.js application will be used in an environment where the users
      don't have direct access to any data stored on the client (e.g.
      [cordova](http://cordova.apache.org)) this action can be overridden to e.g.
      simply transition to the index route.

      @method sessionInvalidated
      @public
    */
    sessionInvalidated = function sessionInvalidated() {
      if (!Ember.testing) {
        if (this._isFastBoot) {
          this.transitionTo(Configuration.rootURL);
        } else {
          window.location.replace(Configuration.rootURL);
        }
      }
    }
  };

  return Object.setPrototypeOf(target, NewClass.prototype);
};
