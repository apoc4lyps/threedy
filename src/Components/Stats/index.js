import React, { useContext } from 'react';
import moment from 'moment';
import ThreedyContext from '../../Contexts/ThreedyContext';

import styles from './styles';

const DAYSEC = 60 * 60 * 24;
const HRSEC = 60 * 60;
const MINSEC = 60;

const VALID_TEMP_UNIT = ( unit ) => {

    if (unit === undefined) return;

    return ['C', 'F'].includes(unit);
}

/* From : To */
const TEMP_CONVERSIONS = {
    'C': {
        'C': t => t,
        'F': t => (t * 9.0 / 5.0) + 32.0
    },
    'F': {
        'C': t => (t - 32.0) * 5.0 / 9.0,
        'F': t => t
    },
    '': {
        'C': t => t,
        'F': t => t
    }
}

const TEMP_SOURCE = (entity) => {


    const u = entity.attributes.unit_of_measurement;

    if (u.includes('C')) {
        return 'C';
    }

    if (u.includes('F')) {
        return 'F';
    }


    return ''

}


const Stat = ({ condition }) => {

    const {
        hass,
        config
    } = useContext(ThreedyContext);

    const {
        round: r,
        temperature_unit
    } = config;

    const round = r === undefined ? true : r;

    const temp_converted = (entity) => {

        switch (temperature_unit) {

            case 'C':
                return TEMP_CONVERSIONS[
                    TEMP_SOURCE(entity)
                ]['C'](entity.state)
            case 'F':
                return TEMP_CONVERSIONS[
                    TEMP_SOURCE(entity)
                ]['F'](entity.state)
            default:
                return entity.state;
        }

    }

    const temp_string = ( entity ) => {

        const val_initial = temp_converted( entity );
        const val = round ? Math.round(val_initial) : val_initial;
        const unit = VALID_TEMP_UNIT(config.temperature_unit) ? '°' + config.temperature_unit : entity.attributes.unit_of_measurement

        return `${val}${unit}`
    }

    const entityEnding = (() => {
        switch (condition) {
            case 'Status':
                return config.use_mqtt ? '_print_status' : '_current_state'
            case 'ETA':
                return config.use_mqtt ? '_print_time_left' : '_time_remaining'
            case 'Elapsed':
                return config.use_mqtt ? '_print_time' : '_time_elapsed'
            case 'Hotend':
                return config.use_mqtt ? '_tool_0_temperature' : '_actual_tool0_temp'
            case 'Bed':
                return config.use_mqtt ? '_bed_temperature' : '_actual_bed_temp'
            default:
                return undefined
        }
    })();

    const entity = entityEnding === undefined ? undefined : hass.states[`${config.base_entity}${entityEnding}`];

    const format_seconds_elapsed = (s) => {
        let days = Math.floor(s / DAYSEC);
        s -= days * DAYSEC;
        let hours = Math.floor(s / HRSEC);
        s -= hours * HRSEC;
        let minutes = Math.floor(s / MINSEC);
        s -= minutes * MINSEC;
        let seconds = s;

        return `${days > 0 ? days + 'd ' : ''}${hours > 0 ? hours + 'h ' : ''}${minutes > 0 ? minutes + "m " : ''}${seconds > 0 ? seconds + "s" : ''}`;
    }

    const string_to_seconds = (s) => {
        var t = s.split(':').reverse ();
        return ((t.length >= 3) ? (+t[2]): 0)*60*60 + 
               ((t.length >= 2) ? (+t[1]): 0)*60 + 
               ((t.length >= 1) ? (+t[0]): 0);
    }

    const formatEntityState = () => {

        if (entity === undefined)
            return '<unknown>'

        switch (condition) {
            case 'Status':
                return entity.state
            case 'ETA':
                return moment().add(config.use_mqtt ? string_to_seconds(entity.state) : entity.state, 's').format(config.use_24hr ? 'HH:mm' : 'h:mm a')
            case 'Elapsed':
                return config.use_mqtt ? format_seconds_elapsed(string_to_seconds(entity.state)) : format_seconds_elapsed(entity.state)
            case 'Hotend':
                return temp_string(entity);
            case 'Bed':
                return temp_string(entity);
            default:
                return '<unknown>'
        }
    }

    return (
        <div style={{ ...styles.Stat }}>
            <p style={{ ...styles.StatText, ...styles.Condition }}>{condition}</p>
            <p style={{ ...styles.StatText }}>{formatEntityState()}</p>
        </div>
    )

}

const Stats = () => {

    const {
        hass,
        config,
    } = useContext(ThreedyContext);

    const round = config.round === undefined ? true : config.round

    const percentComplete = (hass.states[config.use_mqtt ? `${config.base_entity}_print_progress` : `${config.base_entity}_job_percentage`] || { state: -1.0 }).state;

    return (
        <div style={{ ...styles.Stats }}>
            <div style={{ ...styles.Percent }}>
                <p style={{ ...styles.PercentText }}>{round ? Math.round(percentComplete) : percentComplete}%</p>
            </div>
            <div style={{ ...styles.Monitored }}>
                {
                    config.monitored ? config.monitored.map(condition => <Stat condition={condition} />) : (null)
                }
            </div>
        </div>
    )


}

export default Stats;
