'use strict';

const React = require('react');


let AudioPlayer = React.createClass({
    audioEnded: function() {
        let audio = this.refs.audio.getDOMNode();
        this.timeout = setTimeout(function () { audio.play(); }, 4500);
    },

    componentDidMount: function() {
        this.timeout = null;
        this.refs.audio.getDOMNode().addEventListener('ended', this.audioEnded);
    },

    componentWillUnmount: function() {
        clearTimeout(this.timeout);
        this.timeout = null;
        this.refs.audio.getDOMNode().removeEventListener('ended', this.audioEnded);
    },

    render: function() {
        let source;
        if (this.props.direction === 'incoming') {
            source = 'assets/sounds/inbound_ringtone.wav';
        } else if (this.props.direction === 'outgoing') {
            source = 'assets/sounds/outbound_ringtone.wav';
        }
        return (
            <div>
                <audio ref='audio' autoPlay>
                    <source src={source} type="audio/wav" />
                </audio>
            </div>
        );
    }
});

module.exports = AudioPlayer;