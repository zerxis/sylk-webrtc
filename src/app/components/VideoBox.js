'use strict';

const React                     = require('react');
const ReactCSSTransitionGroup   = require('react-addons-css-transition-group');
const ReactMixin                = require('react-mixin');
const rtcninja                  = require('sylkrtc').rtcninja;
const classNames                = require('classnames');
const debug                     = require('debug');
const moment                    = require('moment');
const momentFormat              = require('moment-duration-format');
const FullscreenMixin           = require('../mixins/FullScreen');

const DEBUG = debug('blinkrtc:Video');


class VideoBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            callOverlayVisible: true,
            audioMuted: false,
            videoMuted: false,
            callDuration: null,
            localVideoShow: false,
            remoteVideoShow: false
        };

        this.callTimer = null;
        this.overlayTimer = null;

        // ES6 classes no longer autobind
        this.showCallOverlay = this.showCallOverlay.bind(this);
        this.handleFullscreen = this.handleFullscreen.bind(this);
        this.muteAudio = this.muteAudio.bind(this);
        this.muteVideo = this.muteVideo.bind(this);
        this.hangupCall = this.hangupCall.bind(this);
    }

    componentDidMount() {
        this.refs.localVideo.addEventListener('playing', () => {
            this.setState({localVideoShow: true});    // eslint-disable-line react/no-did-mount-set-state
        });
        this.refs.localVideo.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
        rtcninja.attachMediaStream(this.refs.localVideo, this.props.localMedia);

        this.refs.remoteVideo.addEventListener('playing', () => {
            this.setState({remoteVideoShow: true});    // eslint-disable-line react/no-did-mount-set-state
        });
        this.refs.remoteVideo.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
        rtcninja.attachMediaStream(this.refs.remoteVideo, this.props.call.getRemoteStreams()[0]);

        this.armOverlayTimer();
        this.startCallTimer();
    }

    componentWillUnmount() {
        clearTimeout(this.overlayTimer);
        clearTimeout(this.callTimer);

        this.exitFullscreen();
    }

    handleFullscreen(event) {
        event.preventDefault();
        this.toggleFullscreen(this.refs.videoContainer);
    }

    muteAudio(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getAudioTracks().length > 0) {
            const track = localStream.getAudioTracks()[0];
            if(this.state.audioMuted) {
                DEBUG('Unmute microphone');
                track.enabled = true;
                this.setState({audioMuted: false});
            } else {
                DEBUG('Mute microphone');
                track.enabled = false;
                this.setState({audioMuted: true});
            }
        }
    }

    muteVideo(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            const track = localStream.getVideoTracks()[0];
            if(this.state.videoMuted) {
                DEBUG('Unmute camera');
                track.enabled = true;
                this.setState({videoMuted: false});
            } else {
                DEBUG('Mute camera');
                track.enabled = false;
                this.setState({videoMuted: true});
            }
        }
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.hangupCall();
    }

    startCallTimer() {
        const startTime = new Date();
        this.callTimer = setInterval(() => {
            const duration = moment.duration(new Date() - startTime).format('hh:mm:ss', {trim: false});
            this.setState({callDuration: duration});
        }, 300);
    }

    armOverlayTimer() {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
            this.setState({callOverlayVisible: false});
        }, 4000);
    }

    showCallOverlay() {
        if (this.state.remoteVideoShow) {
            this.setState({callOverlayVisible: true});
            this.armOverlayTimer();
        }
    }

    render() {
        if (this.props.call === null) {
            return (<div></div>);
        }

        const localVideoClasses = classNames({
            'video-thumbnail' : true,
            'mirror'          : true,
            'hidden'          : !this.state.localVideoShow,
            'animated'        : true,
            'fadeIn'          : this.state.localVideoShow || this.state.videoMuted,
            'fadeOut'         : this.state.videoMuted
        });

        const remoteVideoClasses = classNames({
            'hidden'        : !this.state.remoteVideoShow,
            'animated'      : true,
            'fadeIn'        : this.state.remoteVideoShow,
            'large'         : true
        });

        let videoHeader;
        let callButtons;

        if (this.state.callOverlayVisible) {
            const muteButtonIcons = classNames({
                'fa'                    : true,
                'fa-microphone'         : !this.state.audioMuted,
                'fa-microphone-slash'   : this.state.audioMuted
            });

            const muteVideoButtonIcons = classNames({
                'fa'                    : true,
                'fa-video-camera'       : !this.state.videoMuted,
                'fa-video-camera-slash' : this.state.videoMuted
            });

            const fullScreenButtonIcons = classNames({
                'fa'            : true,
                'fa-expand'     : !this.isFullScreen(),
                'fa-compress'   : this.isFullScreen()
            });

            const buttonBarClasses = classNames({
                'video-started' : !this.state.audioOnly
            });

            const videoHeaderTextClasses = classNames({
                'lead'          : true,
                'text-success'  : true
            });

            const commonButtonClasses = classNames({
                'btn'           : true,
                'btn-round'     : true,
                'btn-default'   : true
            });

            const remoteIdentity = this.props.call.remoteIdentity.displayName || this.props.call.remoteIdentity.uri;

            let callDetail;
            if (this.state.callDuration !== null) {
                callDetail = <span><i className="fa fa-clock-o"></i> {this.state.callDuration}</span>;
            } else {
                callDetail = 'Connecting...'
            }

            videoHeader = (
                <div key="header" className="call-header">
                    <p className={videoHeaderTextClasses}><strong>Call with</strong> {remoteIdentity}</p>
                    <p className={videoHeaderTextClasses}>{callDetail}</p>
                </div>
            );

            callButtons = (
                <div className="call-buttons">
                    <button key="muteVideo" type="button" className={commonButtonClasses} onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>
                    <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>
                    {(() => {
                        if (this.isFullscreenSupported()) {
                            return <button key="fsButton" type="button" className={commonButtonClasses} onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>
                        }
                    })()}
                    <br />
                    <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>
                </div>
            );
        }

        return (
            <div className="video-container" ref="videoContainer" onMouseMove={this.showCallOverlay}>
                <ReactCSSTransitionGroup transitionName="videoheader" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
                    {videoHeader}
                </ReactCSSTransitionGroup>
                <video id="remoteVideo" className={remoteVideoClasses} ref="remoteVideo" autoPlay />
                <video id="localVideo" className={localVideoClasses} ref="localVideo" autoPlay muted/>
                <ReactCSSTransitionGroup transitionName="videobuttons" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
                    {callButtons}
                </ReactCSSTransitionGroup>
            </div>
        );
    }
}

VideoBox.propTypes = {
    call: React.PropTypes.object,
    localMedia: React.PropTypes.object,
    hangupCall: React.PropTypes.func
};

ReactMixin(VideoBox.prototype, FullscreenMixin);


module.exports = VideoBox;
