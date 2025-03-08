import React, { useEffect, useState } from "react";
import {SearchEngine} from '@coveo/headless';
import { Card, CardContent, CardMedia, Typography, Container } from "@mui/material";

interface IPokemonSearchProps {
  engine: SearchEngine;
  uniqueId: string;
}

interface Pokemon {
  name: string;
  picture: string;
  type: string;
  raw: any;
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

        const configuration = engine.state.configuration;
        const response = await fetch(
          `https://${configuration.organizationId}.org.coveo.com/rest/search/v2/document?organizationId=${configuration.organizationId}&uniqueId=${uniqueId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${configuration.accessToken}`,
              "Content-Type": "application/json"
            }
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch Pokemon");
        }
        
        const data = await response.json();

        setPokemon({
          name: data.raw.filename,
          picture: data.raw.pokemonpicture,
          type: data.raw.pokemontype,
          raw: data.raw,
        });
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
    <Container maxWidth="sm" style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
      <Card sx={{ maxWidth: 700, textAlign: "center", padding: 2 }}>
        <CardMedia
          component="img"
          height="500"
          width="100"
          image={pokemon.picture}
          alt={pokemon.name}
          style={{ objectFit: 'none' }}
        />
        <CardContent>
          <Typography variant="h5" gutterBottom>{pokemon.name.toUpperCase()}</Typography>
          <Typography variant="body1" color="text.secondary">
            Type: {pokemon.type}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Original Uri: {pokemon.raw.uri}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Title: {pokemon.raw.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Source: {pokemon.raw.source}
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default PokemonCard;