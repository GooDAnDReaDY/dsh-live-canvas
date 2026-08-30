window.__ModuleLoader__.load({
  id: '@goodandready-private/dsh-live-canvas',
  factory: (require) => {
    var module = { exports: {} };
    const React = require('react');

    const NS = '@goodandready-private/dsh-live-canvas';

    function PluginCard({ ctx }) {
      const [expanded, setExpanded] = React.useState(false);
      return React.createElement('div', { className: 'live-canvas-card' },
        React.createElement('button', {
          className: 'live-canvas-head',
          onClick: () => setExpanded(!expanded)
        },
          React.createElement('span', { className: 'live-canvas-title' }, 'Live Canvas Preview')
        )
      );
    }

    module.exports.inject = ['slots'];
    module.exports.apply = function apply(ctx) {
      if (ctx.slots) {
        ctx.slots.register({
          name: 'settings.plugin.item',
          key: NS,
          locale: NS,
          inject: () => ({ ctx })
        }, PluginCard);
      }
    };

    return module.exports;
  }
});
