// vip/web_client/routes.js

// Import utilities
import router from 'girder/router';
import events from 'girder/events';

// Import Views
import Hello from './views/Hello';

// Tuto
router.route('hello', 'hello', function() {
  events.trigger('g:navigateTo', Hello);
})
