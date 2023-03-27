import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import axios from 'axios';

import InputContainer from "../components/InputContainer";
import List from "../components/List";

import store from "../utils/store";
import StoreApi from "../utils/storeApi";

import "./styles.scss";

const crmAPI = 'http://127.0.0.1:3336/v1';
const headers = {
  'Authorization': 'Bearer ' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbG9uZUlkIjoic3RhZ2luZ191c2VyX2luc3VyYW5jZV8xdVlONERBQyIsInVzZXJJZCI6IjM5MjExNDYxNTUiLCJlbWFpbCI6ImZ0aG9tcHNvbi5icm9rZXJAZGlnaW5leHQuYXUiLCJtb2JpbGVOdW1iZXIiOiIrNjEyMTIzNDU2NzgiLCJyb2xlIjoiYnV5ZXIiLCJjb21wYW55SWQiOjEsImJyYW5jaElkIjoxLCJzeXN0ZW1JZCI6InN0YWdpbmdfdXNlcl9pbnN1cmFuY2VfMXVZTjREQUMiLCJpYXQiOjE2NzkyODI4NTV9.TDhbHItDxdg2jGczMfvbbI_YrOjMyav-pgmmrsJHa5I'
}

export default function Home() {
  const [data, setData] = useState([]);

  const fetchStages = async () => {
    await axios.get(`${crmAPI}/kanban/stages/?stageType=tasks&includes[0]=cards`, { headers })
    .then(res => {     
      setData(() => res.data)
    })
    .catch(err => {
      console.log(err);
    })
  }

  React.useEffect(() => {
    fetchStages()
  }, [])

  const addMoreCard = async (title, listId) => {
    if (!title) {
      return;
    }

    await axios.post(`${crmAPI}/kanban/cards/stages/${listId}`, {
      title,
      type: 'tasks',
    }, { headers })
    .then(() => fetchStages())
    .catch(err => {
      console.log(err);
    })
  };

  const removeCard = async (cardId) => {
    const { id } = data.find(({ cards }) => {
      return !!cards.find(card => card.id === cardId)
    })

    await axios.post(`${crmAPI}/kanban/cards/${id}`, { headers })
    .then(() => fetchStages())
    .catch(err => {
      console.log(err);
    }) 
  };

  const updateCardTitle = async (title, cardId) => {
    const { id } = data.find(({ cards }) => {
      return !!cards.find(card => card.id === cardId)
    })
    
    await axios.put(`${crmAPI}/kanban/cards/${id}`, {
        title,
      }, { headers })
      .then(() => fetchStages())
      .catch(err => {
        console.log(err);
      })
  };

  const addMoreList = async (title) => {
    if (!title) {
      return;
    }

    await axios.post(`${crmAPI}/kanban/stages`, {
      title,
      type: 'tasks',
    }, { headers })
    .then(() => fetchStages())
    .catch(err => {
      console.log(err);
    })
  }

  const updateListTitle = async (title, listId) => {
    const { id } = data.find(datum => datum.id === listId)

    await axios.put(`${crmAPI}/kanban/stages/${id}`, {
        title,
      }, { headers })
      .then(() => fetchStages())
      .catch(err => {
        console.log(err);
      })
  };

  const deleteList = async (listId) => {
    const { id } = data.find(datum => datum.id === listId)

    await axios.delete(`${crmAPI}/kanban/stages/${id}`, { headers })
      .then(() => fetchStages())
      .catch(err => {
        console.log(err);
      })
  };

  const onDragEnd = async (result) => {
    const { 
      destination, // Where the drag ended
      source, // Where the drag started
      draggableId, // Stringified index of the draggable 
      type // List or Card 
    } = result;
    const tempData = [...data]

    console.log(result)
    if (!destination) {
      return;
    }

    // If moving a list
    if (type === "list") {
      const item = data[source.index]

      tempData.splice(source.index, 1)
      tempData.splice(destination.index, 0, item)

      const newOrder = tempData.map(({ order }, i) => `order[${order}]=${i}`).join('&')

      await axios.put(
        `${crmAPI}/kanban/stages/reorder/tasks?${newOrder}`, 
        null, 
        { headers }
      )
      .then(() => fetchStages())
      .catch(err => console.error(err))

      return
    }

    const sourceList = tempData.filter(({ id }) => id === Number(source.droppableId))?.[0]
    const cardsList = [ ...sourceList.cards ]
    const destinationList = tempData.filter(({ id }) => id === Number(destination.droppableId))?.[0]
    const draggedCard = cardsList[source.index]

    // ---------- If dragging a card ------------

    // If dragged a card inside the source list
    if (source.droppableId === destination.droppableId) {
      console.log('here 1')
      sourceList.cards.splice(source.index, 1);
      sourceList.cards.splice(destination.index, 0, draggedCard);

      const newOrder = sourceList.cards.map(({ order }, i) => `order[${order}]=${i}`).join('&')

      return await axios.put(
        `${crmAPI}/kanban/cards/reorder/${sourceList.id}?${newOrder}`, 
        null, 
        { headers }
      )
      .then(() => fetchStages())
      .catch(err => console.error(err))
    } else { // If dragged a card outside the source list
      console.log('here 2')
      sourceList.cards.splice(source.index, 1);
      destinationList.cards.splice(destination.index, 0, draggedCard);

      return await axios.put(
        `${crmAPI}/kanban/cards/transfer-card/stages/${destinationList.id}/cards/${draggedCard.id}/order/${destination.index}`, 
        null, 
        { headers }
      )
      .then(() => fetchStages())
      .catch(err => console.error(err))
    }
  };

  return (
    <StoreApi.Provider
      value={{
        addMoreCard,
        addMoreList,
        updateListTitle,
        removeCard,
        updateCardTitle,
        deleteList
      }}
    >
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="app" type="list" direction="horizontal">
          {(provided) => (
            <div
              className="wrapper"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {data?.map?.((datum, index) => {
                return <List list={datum} key={datum.id} index={index} />;
              })}
              <div>
                <InputContainer type="list" />
              </div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </StoreApi.Provider>
  );
}
