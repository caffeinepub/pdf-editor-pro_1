import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Text "mo:core/Text";
import Migration "migration";

(with migration = Migration.run)
actor {
  type Preferences = {
    darkMode : Bool;
    recentTools : [Text];
    sessionMetadata : ?{
      fileName : Text;
      pageCount : Nat;
    };
  };

  let preferences = Map.empty<Principal, Preferences>();

  public shared ({ caller }) func setPreferences(prefs : Preferences) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Anonymous users cannot set preferences");
    };
    preferences.add(caller, prefs);
  };

  public query ({ caller }) func getPreferences() : async Preferences {
    switch (caller.isAnonymous(), preferences.get(caller)) {
      case (true, null) { Runtime.trap("Anonymous users cannot have preferences") };
      case (_, ?prefs) { prefs };
      case (_, null) { Runtime.trap("Preferences not found") };
    };
  };
};
