// vip/web_client/views/Hello.js

// View
import View from 'girder/views/View';

// Template
import HelloTemplate from '../templates/hello.pug';

var Hello = View.extend({
  initialize: function (settings) {
    // Constructor, set variables...
    this.message = "Welcome";
    this.render();
  },

  events: {
    // Lier un évènement à une fonction, ex:
    'click #buttonHello' : 'sayHello'
  },

  render: function () {
    this.$el.html(HelloTemplate({
      // Variables envoyées dans le template, ex:
      message: this.message
    }));
  },

  // Cette fonction est appelée quand l'utilisateur clique sur le bouton qui a comme id 'buttonHello'
  sayHello: function (e) {
    // Récupérer l'élément de la page avec un id 'message'
    var a = e.view.$.find('#message');

    // Le transformer en objet jquery et remplacer le texte
    $(a).text('Hello !');
  }
});

export default Hello;
