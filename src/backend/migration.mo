import Principal "mo:core/Principal";
import Map "mo:core/Map";
import Text "mo:core/Text";

module {
  type OldActor = {
    userPreferences : Map.Map<Text, Text>;
  };

  type Preferences = {
    darkMode : Bool;
    recentTools : [Text];
    sessionMetadata : ?{
      fileName : Text;
      pageCount : Nat;
    };
  };

  type NewActor = {
    preferences : Map.Map<Principal, Preferences>;
  };

  public func run(old : OldActor) : NewActor {
    {
      preferences = Map.empty<Principal, Preferences>();
    };
  };
};
