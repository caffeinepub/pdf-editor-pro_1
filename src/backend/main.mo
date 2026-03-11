import Map "mo:core/Map";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";

actor {
  let userPreferences = Map.empty<Text, Text>();

  public shared ({ caller }) func setPreference(key : Text, value : Text) : async () {
    userPreferences.add(key, value);
  };

  public query ({ caller }) func getPreference(key : Text) : async Text {
    switch (userPreferences.get(key)) {
      case (null) { Runtime.trap("Preference not found") };
      case (?value) { value };
    };
  };

  public query ({ caller }) func ping() : async Bool {
    true;
  };
};
