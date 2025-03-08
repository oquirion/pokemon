import React, { useEffect, useState } from "react";
import {SearchEngine} from '@coveo/headless';

interface IPokemonSearchProps {
  engine: SearchEngine;
  uniqueId: string;
}

interface Pokemon {
  name: string;
  sprite: string;
  types: string[];
}

const PokemonCard: React.FC<IPokemonSearchProps> = (props) => {
  const {engine, uniqueId} = props;
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        setLoading(true);
        setError(null);

        //engine.executeFirstSearch();

        /*
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${uniqueId.toLowerCase()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch Pokemon");
        }
        const data = await response.json();
        
        setPokemon({
          name: data.name,
          sprite: data.sprites.front_default,
          types: data.types.map((t: any) => t.type.name),
        });
        */
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchPokemon();
  }, [engine, uniqueId]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!pokemon) return null;

  return (
    <div className="border p-4 rounded-md shadow-lg text-center">
      <h2 className="text-xl font-bold capitalize">{pokemon.name}</h2>
      <img src={pokemon.sprite} alt={pokemon.name} className="mx-auto" />
      <p className="text-gray-600">Types: {pokemon.types.join(", ")}</p>
    </div>
  );
};

export default PokemonCard;