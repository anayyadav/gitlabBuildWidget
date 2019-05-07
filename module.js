(function () {
    'use strict';

    var widget_state,
        config = {
            view: {
                defaults: {
                    // widget title
                    title: 'Build' 

                },
                controller: 'BuildGitlabWidgetViewController',
                controllerAs: 'buildGitlabView',
                templateUrl: 'components/widgets/gitlabBuild/view.html'
            },
            config: {
                controller: 'BuildGitlabWidgetConfigController',
                controllerAs: 'buildGitlabConfig',
                templateUrl: 'components/widgets/gitlabBuild/config.html'
            },
            getState: getState
        };

    angular
        .module(HygieiaConfig.module)
        .config(register);

    register.$inject = ['widgetManagerProvider', 'WidgetState'];
    function register(widgetManagerProvider, WidgetState) {
        widget_state = WidgetState;
        widgetManagerProvider.register('gitlabBuild', config);
    }

    function getState(config) {
        // make sure config values are set
        return HygieiaConfig.local || (config.id && config.options.buildDurationThreshold && config.options.consecutiveFailureThreshold) ?
            widget_state.READY :
            widget_state.CONFIGURE;
    }
})();
