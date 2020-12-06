const Applet = imports.ui.applet;
const Util = imports.misc.util;
const GLib = imports.gi.GLib;
const Interfaces = imports.misc.interfaces
const Lang = imports.lang;
const Main = imports.ui.main;

function fire_cmd(command) {
    try {
        let [result, stdout, stderr] = GLib.spawn_command_line_sync(command);
        if (stdout != null) {
            return stdout.toString();
        }
    } catch (e) {
        global.logError(e);
    }
    return "";
}

class BatApplet extends Applet.TextIconApplet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);
        this.setAllowedLayout(Applet.AllowedLayout.BOTH);

        Main.systrayManager.registerRole("power", metadata.uuid);
        Main.systrayManager.registerRole("battery", metadata.uuid);

        Interfaces.getDBusProxyAsync("org.cinnamon.SettingsDaemon.Power", Lang.bind(this, function(proxy, error) {
            this._proxy = proxy;
            this._proxy.connect("g-properties-changed", Lang.bind(this, this._devicesChanged));
            this._devicesChanged();
        }));
    }

    _devicesChanged() {
        let out = fire_cmd('acpi');
        let percentage = parseInt(/\d+\%/g.exec(out)[0].replace('%', ''));
        let status = /Charging|Discharging/g.exec(out)[0].toLowerCase();

        let iconStatus = status == 'charging' ? '-charging' : '';
        if (percentage > 95 && status == 'charging') {
            iconStatus = '-charged';
        }

        let icon = "battery-full";

        switch (true) {
            //full
            case (percentage >= 80):
                icon = "battery-full"+iconStatus;
                break;
            //good
            case (percentage < 80 && percentage >= 30):
                icon = "battery-good"+iconStatus;
                break;
            //low
            case (percentage < 30 && percentage >= 15):
                icon = "battery-low"+iconStatus;
                break;
            //empty
            case (percentage < 15 && percentage >= 6):
                icon = "battery-empty"+iconStatus;
                break;
            //caution
            case (percentage < 6):
                icon = "battery-caution"+iconStatus;
        }

        this.set_applet_icon_symbolic_name(icon);
        this.set_applet_tooltip(out);
        this.set_applet_label(percentage + '%');
    }
}


function main(metadata, orientation, panelHeight, instance_id) {
    return new BatApplet(metadata, orientation, panelHeight, instance_id);
}